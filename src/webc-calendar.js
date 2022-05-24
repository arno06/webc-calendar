(function(){

    NodeList.prototype.forEach = Array.prototype.forEach;

    Function.prototype.proxy = function(pInstance)
    {
        var ref = this;
        return function(){ref.apply(pInstance, arguments);};
    };

    class Calendar extends HTMLElement
    {
        // component attributes
        static get observedAttributes() {
            return ['format', 'multiple', 'disabled-dates', 'disabled-week-days', 'events', 'colors-scheme', 'expanded', 'date-min', 'date-max', 'selected-dates'];
        }

        constructor(){
            super();
            let d = new Date();
            this.format = 'YYYY-MM-DD';
            this.currentMonth = d.getMonth();
            this.currentYear = d.getFullYear();
            this.disabledDates = [];
            this.disabledWeekDays = [];
            this.expanded = false;
            this.dateMin = null;
            this.dateMax = null;
            this.selectedDates = [];
            this.multiple = false;
            this.range = false;//tbd
            this.colors = {
                'border':'#eee',
                'disableBackground':'#f4f4f4',
                'disable':'#ccc',
                'todayBackground':'#00aeff',
                'today':'#fff',
                'hoverBackground':'#bceef5',
                'hover':'#fff'
            };
            this.events = null;
            this.formatDate(d);
        }

        attributeChangedCallback(pAttr, pOldValue, pNewValue){
            if(pOldValue===pNewValue){
                return;
            }
            switch(pAttr){
                case "disabled-week-days":
                    this.disabledWeekDays = pNewValue.split(',').map(Number);
                    if(this.shadow){
                        this.disableWeekDays();
                    }
                    return;
                case "disabled-dates":
                    this.disabledDates = pNewValue.split(',');
                    break;
                case "events":
                    let parsed = pNewValue.split(',').map(this.parseEvents);
                    this.events = {};
                    let ref = this;
                    parsed.forEach(function(pInfo){
                        ref.events[pInfo.date] = pInfo.events;
                    });
                    break;
                case "format":
                    this.format = pNewValue;
                    break;
                case "colors-scheme":
                    let colors = pNewValue.split(',');
                    for(let c in colors){
                        let p = colors[c].split(':');
                        if(!this.colors.hasOwnProperty(p[0])){
                            continue;
                        }
                        this.colors[p[0]] = p[1];
                    }
                    break;
                case "range":
                case "multiple":
                case "expanded":
                    this[pAttr] = pNewValue==="true";
                    break;
                case "date-min":
                    this.dateMin = this.strToDate(pNewValue);
                    break;
                case "date-max":
                    this.dateMax = this.strToDate(pNewValue);
                    break;
                case "selected-dates":
                    this.selectedDates = pNewValue.split(',');
                    if(!this.multiple && this.selectedDates.length>1){
                        this.selectedDates = [this.selectedDates[0]];
                    }
                    break;
            }
            if(this.shadow){
                this.render(this.currentMonth);
            }
        }

        connectedCallback(){
            this.shadow = this.attachShadow({mode: 'closed'});
            let tpl = TEMPLATE;
            for(let l in this.colors){
                tpl = tpl.replaceAll('@'+l, this.colors[l]);
            }
            this.shadow.innerHTML = tpl;
            let ref = this;
            this.shadow.querySelectorAll('header>.button').forEach(function(pButton){
                pButton.addEventListener('click', ref.monthNavHandler.proxy(ref));
            });
            this.shadow.querySelectorAll('header>div>.year .button').forEach(function(pButton){
                pButton.addEventListener('click', ref.yearNavHandler.proxy(ref));
            });
            let labels = this.shadow.querySelector('.container .labels');
            Localization.days.forEach(function(pDay){
                let div = document.createElement('div');
                div.classList.add('weekday');
                div.innerHTML = pDay.slice(0, 3)+'.';
                labels.appendChild(div);
            });
            this.render(this.currentMonth);
        }

        parseEvents(pDay){
            let parts = pDay.split(':');
            return {date:parts[0], events:parts[1].split('|')};
        }

        yearNavHandler(pEvent){
            let direction = pEvent.currentTarget.classList.contains('previous')?-1:1;
            this.currentYear += direction;
            this.render(this.currentMonth);
        }

        monthNavHandler(pEvent){
            let direction = pEvent.currentTarget.classList.contains('previous')?-1:1;
            this.render(this.currentMonth+direction);
        }

        render(pMonth){
            let ref = this;
            let shadow = this.shadow;
            if(this.expanded){
                shadow.querySelector('.container').classList.add('expanded');
            }
            shadow.querySelector('.container .days').innerHTML = "";
            let currentDates = this.getDatesByMonth(pMonth);
            currentDates.forEach(function(pDays){
                let col = document.createElement('div');
                col.classList.add('col');
                pDays.forEach(function(pDay){
                    let d = document.createElement('div');
                    if(pDay.title){
                        d.setAttribute("title", pDay.title);
                    }
                    d.classList.add('day');
                    d.setAttribute("data-value", pDay.value);
                    if(pDay.css.length>0){
                        pDay.css.forEach((pCls)=>d.classList.add(pCls));
                    }
                    let s = document.createElement('span');
                    s.innerHTML = pDay.label;
                    d.appendChild(s);
                    d.addEventListener('click', ref.daySelectedHandler.proxy(ref));

                    if(ref.events[pDay.value]){
                        let evts = document.createElement('div');
                        evts.classList.add('events');
                        ref.events[pDay.value].forEach(function(pColor){
                            let ele = document.createElement('div');
                            ele.style.backgroundColor = pColor;
                            evts.appendChild(ele);
                        });
                        d.appendChild(evts);
                    }

                    col.appendChild(d);
                });
                shadow.querySelector('.container .days').appendChild(col);
            });
            if(this.disabledWeekDays){
                this.disableWeekDays();
            }
        }

        daySelectedHandler(e){
            if(!this.multiple){
                this.selectedDates = [];
            }
            let val = e.currentTarget.getAttribute("data-value");
            this.selectedDates.push(val)
            this.dispatchEvent(new CustomEvent('day-selected', {composed:true, detail:val}));
            this.render(this.currentMonth);
        }

        getDatesByMonth(pMonth){
            let dates = [[], [], [], [], [], [], []];
            let d = new Date();
            d.setFullYear(this.currentYear, pMonth, 1);
            let month = d.getMonth();
            let d1 = d.getDay();

            this.currentYear = d.getFullYear();
            this.currentMonth = month;
            this.shadow.querySelector('header>div>.month').innerHTML = Localization.months[this.currentMonth];
            this.shadow.querySelector('header>div>.year label').innerHTML = this.currentYear.toString();

            let formattedToday = this.formatDate(new Date());
            let day;
            while(d.getMonth()===month){
                day = d.getDay();
                let formattedDate = this.formatDate(d);
                let cls = [];
                let title = null;
                if(formattedDate===formattedToday){
                    cls.push("today");
                    title = Localization.today;
                }
                if(this.disabledDates.indexOf(formattedDate)>-1
                || (this.dateMin && d.getTime()<this.dateMin.getTime())
                || (this.dateMax && d.getTime()>this.dateMax.getTime())){
                    cls.push("disabled");
                }
                if(this.selectedDates.indexOf(formattedDate)>-1){
                    cls.push("selected");
                }
                dates[day].push({label:d.getDate(), value:formattedDate, css:cls, title:title});
                d.setDate(d.getDate()+1);
            }
            let sundays = dates.shift();
            dates.push(sundays);

            for(day;day<dates.length;day++){
                dates[day].push({label:'', value:'', css:['disabled']});
            }

            d1--;
            if(d1<0){
                d1 = 6;
            }
            for(let i = 0, max = d1; i<max; i++){
                dates[i].unshift({label:'', value:'', css:['disabled']});
            }
            return dates;
        }

        disableWeekDays(){
            let ref = this;
            this.shadow.querySelectorAll('.container .days .col').forEach(function(pCol, pIndex){
                if(ref.disabledWeekDays.indexOf(pIndex)>-1){
                    pCol.classList.add('disabled');
                }else{
                    pCol.classList.remove('disabled');
                }
            });
        }

        formatDate(pDate){
            let parts = {
                'YYYY':pDate.getUTCFullYear(),
                'MM':pDate.getMonth() + 1,
                'DD':pDate.getDate()
            };
            if(parts.MM<10){
                parts.MM = "0"+parts.MM;
            }
            if(parts.DD<10){
                parts.DD = "0"+parts.DD;
            }

            let val = this.format;
            for(let j in parts){
                val = val.replace(j, parts[j]);
            }
            return val;
        }

        strToDate(pStr){
            let y = pStr.slice(this.format.indexOf('YYYY'), 4);
            let m = pStr.slice(this.format.indexOf('MM'), this.format.indexOf('MM')+2);
            let d = pStr.slice(this.format.indexOf('DD'), this.format.indexOf('DD')+2);
            return new Date(y,m-1,d);
        }
    }

    const TEMPLATE = `
<style>
    :host{--disable-color:#f4f4f4;--border-color:#eee;border-radius:5px;position:relative;user-select: none;display:flex;flex-direction: column;width:700px;background:#fff;box-shadow:0 0 3px rgba(0, 0, 0, .25);padding:1em;box-sizing: border-box;font-family: sans-serif;}
    .button{display:flex;cursor: pointer;width:30px;height:30px;border-radius: 50%;justify-content: center;align-items: center;border:solid 1px transparent;}
    .button:hover{background:rgba(32,33,36,0.039);border:solid 1px rgba(32,33,36,0.19);}
    header{display:flex;justify-content: space-between;align-items: center;flex:0 0 auto;}
    header>div{display:flex;}
    header>div>.month{padding:.5em 0;margin-right:5px;}
    header>div>.year{display:flex;align-items: center;}
    header>div>.year label{padding:.5em 0;}
    header>div>.year .previous,
    header>div>.year .next{display:flex;justify-content:center;align-items:center;width:16px;height:16px;font-size:0.8em;text-align: center;opacity: 0;transition:opacity .3s;padding-left:0;padding-right:0;}
    header>div>.year .previous{margin-right:5px;}
    header>div>.year .next{margin-left:5px;}
    header>div>.year:hover .previous,
    header>div>.year:hover .next{opacity: 1;}
    .container{flex: 1 1 auto;background:#fff;}
    .container>div{display:flex;justify-content: space-between;}
    .container>div>div{flex: 1 1 auto;text-align: center;}
    .container>div>div.weekday{font-size:0.7em;padding:5px 0;}
    .container>.days{border-left:solid 1px @border;}
    .container>.days>.col{border-right:solid 1px @border;border-bottom:solid 1px @border;}
    .container>.days>.col.disabled{background: @disableBackground;pointer-events: none;}
    .container>.days>.col.disabled>.day>span{color:#ccc;}
    .container>.days>.col>.day{position:relative;border-top:solid 1px @border;height:50px;display:flex;justify-content: center;align-items: center;cursor:pointer;}
    .container>.days>.col>.day>span{font-size:.9em;color:#aaa;display:flex;justify-content: center;align-items: center;width:30px;height:30px;border-radius:50%;transition:all .3s;}
    .container>.days>.col>.day.today>span{background:@todayBackground;color:@today;}
    .container>.days>.col>.day:hover>span,
    .container>.days>.col>.day.selected>span{background:@hoverBackground;color:@hover;}
    .container>.days>.col>.day.disabled{pointer-events: none;background: @disableBackground;}
    
    .container>.days>.col>.day>.events{display:flex;position:absolute;bottom:3px;}
    .container>.days>.col>.day>.events>div{width:5px;height:5px;margin-right:3px;border-radius: 50%;}
    .container>.days>.col>.day>.events>div:last-of-type{margin:0;}
    
    .container.expanded>.days>.col>.day{height:100px;align-items: center;justify-content:start;flex-direction: column;}
    .container.expanded>.days>.col>.day>.events{display:flex;flex-direction: column;width:100%;position: relative;padding:3px;box-sizing:border-box;}
    .container.expanded>.days>.col>.day>.events>div{height:10px;margin-top:3px;width:100%;border-radius:3px;}

</style>
<header><span class="previous button">&lt;</span><div><span class="month">Mai</span> <span class="year"><span class="previous button">&lt;</span><label>2022</label><span class="next button">&gt;</span></span></div><span class="next button">&gt;</span></header>
<div class="container">
    <div class="labels"></div>
    <div class="days"></div>
</div>
`;

    let Localization = {
        'today':'Aujourd\'hui',
        'days':['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
        'months':['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    };

    window.customElements.define('webc-calendar', Calendar);
})();
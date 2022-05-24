NodeList.prototype.forEach = NodeList.prototype.forEach||Array.prototype.forEach;
Function.prototype.proxy = Function.prototype.proxy||function(pInstance) {let ref = this;return function(){ref.apply(pInstance, arguments);};};

class WebCCalendar extends HTMLElement
{
    static TEMPLATE = `
<style>
    :host{--disable-color:#f4f4f4;--border-color:#eee;border-radius:5px;position:relative;user-select: none;display:flex;flex-direction: column;width:700px;background:#fff;box-shadow:0 0 3px rgba(0, 0, 0, .25);padding:1em;box-sizing: border-box;font-family: sans-serif;}
    .button{display:flex;cursor: pointer;width:30px;height:30px;border-radius: 50%;justify-content: center;align-items: center;border:solid 1px transparent;}
    .button:hover{background:rgba(32,33,36,0.039);border:solid 1px rgba(32,33,36,0.19);}
    header{display:flex;justify-content: start;align-items: center;flex:0 0 auto;}
    header .button.today{font-size:.8em;width:auto;border-radius:3px;padding-left:10px;padding-right:10px;margin-right:10px;border:solid 1px #afafaf;}
    header>div.picker{display:flex;align-items: center;}
    header>div.picker>div{display:flex;align-items: center;}
    header>div.picker .month{padding:.5em 0;margin-right:5px;}
    header>div.picker .months .button{background:url('@svg') no-repeat center center;background-size:20px 20px;}
    header>div.picker .months .button.previous{transform:rotate(180deg);}
    header>div.picker .year{display:flex;align-items: center;}
    header>div.picker .year label{padding:.5em 0;}
    header>div.picker .year .previous,
    header>div.picker .year .next{background:url('@svg') no-repeat center center;background-size:10px 10px;transform:rotate(90deg);display:flex;justify-content:center;align-items:center;width:16px;height:16px;font-size:0.8em;text-align: center;opacity: 0;transition:opacity .3s;padding-left:0;padding-right:0;}
    header>div.picker .year .next{transform:rotate(-90deg);}
    header>div.picker .year:hover .previous,
    header>div.picker .year:hover .next{opacity: 1;}
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
<header><div class="button today">@local.today</div><div class="picker"><div class="months actions"><span class="previous button"></span><span class="next button"></span></div><div><span class="month">Mai</span> <span class="year"><label>2022</label><span class="actions"><span class="next button"></span><span class="previous button"></span></span></span></div></div></header>
<div class="container">
    <div class="labels"></div>
    <div class="days"></div>
</div>
`;

    static EVENT_DAY_SELECTED = "day_selected";
    static EVENT_DAY_UNSELECTED = "day_unselected";
    static EVENT_SELECTION_UPDATED = "selection_updated";

    static Localization = {
    'today':'Aujourd\'hui',
    'days':['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
    'months':['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
};

    static ARROW = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 330 330"><path d="M250.606,154.389l-150-149.996c-5.857-5.858-15.355-5.858-21.213,0.001 c-5.857,5.858-5.857,15.355,0.001,21.213l139.393,139.39L79.393,304.394c-5.857,5.858-5.857,15.355,0.001,21.213 C82.322,328.536,86.161,330,90,330s7.678-1.464,10.607-4.394l149.999-150.004c2.814-2.813,4.394-6.628,4.394-10.606 C255,161.018,253.42,157.202,250.606,154.389z"/></svg>';

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
        this.events = [];
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
            this.render();
        }
    }

    connectedCallback(){
        this.shadow = this.attachShadow({mode: 'closed'});
        let tpl = WebCCalendar.TEMPLATE;
        tpl = tpl.replaceAll('@local.today', WebCCalendar.Localization.today);
        tpl = tpl.replaceAll('@svg', WebCCalendar.ARROW);
        for(let l in this.colors){
            tpl = tpl.replaceAll('@'+l, this.colors[l]);
        }
        this.shadow.innerHTML = tpl;
        let ref = this;
        this.shadow.querySelectorAll('header>div.picker .months.actions>.button').forEach(function(pButton){
            pButton.addEventListener('click', ref.monthNavHandler.proxy(ref));
        });
        this.shadow.querySelectorAll('header>div.picker .year .button').forEach(function(pButton){
            pButton.addEventListener('click', ref.yearNavHandler.proxy(ref));
        });
        this.shadow.querySelector('header>.button.today').addEventListener('click', this.todayClickedHandler.proxy(this));
        let labels = this.shadow.querySelector('.container .labels');
        WebCCalendar.Localization.days.forEach(function(pDay){
            let div = document.createElement('div');
            div.classList.add('weekday');
            div.innerHTML = pDay.slice(0, 3)+'.';
            labels.appendChild(div);
        });
        this.render();
    }

    parseEvents(pDay){
        let parts = pDay.split(':');
        return {date:parts[0], events:parts[1].split('|')};
    }

    yearNavHandler(pEvent){
        let direction = pEvent.currentTarget.classList.contains('previous')?-1:1;
        this.currentYear += direction;
        this.render();
    }

    monthNavHandler(pEvent){
        let direction = pEvent.currentTarget.classList.contains('previous')?-1:1;
        this.currentMonth+=direction;
        this.render();
    }

    todayClickedHandler(e){
        let d = new Date();
        this.currentMonth = d.getMonth();
        this.currentYear = d.getFullYear();
        this.render();
    }

    render(){
        let ref = this;
        let shadow = this.shadow;
        if(this.expanded){
            shadow.querySelector('.container').classList.add('expanded');
        }
        shadow.querySelector('.container .days').innerHTML = "";
        let currentDates = this.getDatesByMonth(this.currentMonth);
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
                d.addEventListener('click', ref.dayClickedHandler.proxy(ref));

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

    dayClickedHandler(e){
        let val = e.currentTarget.getAttribute("data-value");
        let evt = null;
        if(this.selectedDates.indexOf(val)>-1){
            this.selectedDates.splice(this.selectedDates.indexOf(val), 1);
            evt = WebCCalendar.EVENT_DAY_UNSELECTED;
        }else{
            if(!this.multiple){
                this.selectedDates = [];
            }
            this.selectedDates.push(val)
            evt = WebCCalendar.EVENT_DAY_SELECTED;
        }
        this.render();
        let detail = {
            value:val,
            selectedDates:this.selectedDates
        };
        this.dispatchEvent(new CustomEvent(evt, {composed:true, detail:detail}));
        this.dispatchEvent(new CustomEvent(WebCCalendar.EVENT_SELECTION_UPDATED, {composed:true, detail:detail}));
    }

    getDatesByMonth(pMonth){
        let dates = [[], [], [], [], [], [], []];
        let d = new Date();
        d.setFullYear(this.currentYear, pMonth, 1);
        let month = d.getMonth();
        let d1 = d.getDay();

        this.currentYear = d.getFullYear();
        this.currentMonth = month;
        this.shadow.querySelector('header>div.picker .month').innerHTML = WebCCalendar.Localization.months[this.currentMonth];
        this.shadow.querySelector('header>div.picker .year label').innerHTML = this.currentYear.toString();

        let formattedToday = this.formatDate(new Date());
        let day;
        while(d.getMonth()===month){
            day = d.getDay();
            let formattedDate = this.formatDate(d);
            let cls = [];
            let title = null;
            if(formattedDate===formattedToday){
                cls.push("today");
                title = WebCCalendar.Localization.today;
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

window.customElements.define('webc-calendar', WebCCalendar);
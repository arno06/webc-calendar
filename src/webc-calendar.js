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
            return ['format', 'disabled-week-days', 'events'];
        }

        constructor(){
            super();
            let d = new Date();
            this.currentMonth = d.getMonth();
            this.currentYear = d.getFullYear();
            this.disabledWeekDays = null;
            this.events = null;
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
                    break;
                case "events":
                    let parsed = pNewValue.split(',').map(this.parseEvents);
                    this.events = {};
                    let ref = this;
                    parsed.forEach(function(pInfo){
                        ref.events[pInfo.date] = pInfo.events;
                    });
                    console.log(this.events);
                    break;
            }
        }

        connectedCallback(){
            this.shadow = this.attachShadow({mode: 'closed'});
            this.shadow.innerHTML = TEMPLATE;
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
            shadow.querySelector('.container .days').innerHTML = "";
            let currentDates = this.getDatesByMonth(pMonth);
            currentDates.forEach(function(pDays){
                let col = document.createElement('div');
                col.classList.add('col');
                pDays.forEach(function(pDay){
                    let d = document.createElement('div');
                    d.classList.add('day');
                    d.setAttribute("data-value", pDay.value);
                    if(pDay.css){
                        d.classList.add(pDay.css);
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
            this.dispatchEvent(new CustomEvent('day-selected', {composed:true, detail:e.currentTarget.getAttribute("data-value")}));
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

            while(d.getMonth()===month){
                let day = d.getDay();
                let cls = d.toUTCString()===(new Date().toUTCString())?"today":"";//A Améliorer
                let m = d.getMonth()+1;
                if(m<10){
                    m = "0"+m;
                }
                let date = d.getDate();
                if(date<10){
                    date = "0"+date;
                }
                dates[day].push({label:d.getDate(), value:d.getFullYear()+'-'+m+'-'+date, css:cls});
                d.setDate(d.getDate()+1);
            }
            let sundays = dates.shift();
            dates.push(sundays);

            d1--;
            if(d1<0){
                d1 = 6;
            }
            for(let i = 0, max = d1; i<max; i++){
                dates[i].unshift({label:'', value:'', css:'disabled'});
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
    }

    const TEMPLATE = `
<style>
    :host{border-radius:5px;position:relative;user-select: none;display:flex;flex-direction: column;width:700px;background:#fff;box-shadow:0 0 3px rgba(0, 0, 0, .25);padding:1em;box-sizing: border-box;font-family: sans-serif;}
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
    .container>.days{border-left:solid 1px #999;}
    .container>.days>.col{border-right:solid 1px #999;border-bottom:solid 1px #999;}
    .container>.days>.col.disabled{background:#f4f4f4;pointer-events: none;}
    .container>.days>.col.disabled>.day>span{color:#ccc;}
    .container>.days>.col>.day{position:relative;border-top:solid 1px #999;height:50px;display:flex;justify-content: center;align-items: center;cursor:pointer;}
    .container>.days>.col>.day:last-of-type{border-bottom:solid 1px #999;}
    .container>.days>.col>.day>span{font-size:.9em;color:#aaa;display:flex;justify-content: center;align-items: center;width:30px;height:30px;border-radius:50%;transition:all .3s;}
    .container>.days>.col>.day:hover>span{background:#bceef5;color:#000;}
    .container>.days>.col>.day.today>span{background:#00aeff;color:#fff;}
    .container>.days>.col>.day.disabled{pointer-events: none;}
    
    .container>.days>.col>.day>.events{display:flex;position:absolute;bottom:3px;}
    .container>.days>.col>.day>.events>div{width:5px;height:5px;margin-right:3px;border-radius: 50%;}
    .container>.days>.col>.day>.events>div:last-of-type{margin:0;}
</style>
<header><span class="previous button">&lt;</span><div><span class="month">Mai</span> <span class="year"><span class="previous button">&lt;</span><label>2022</label><span class="next button">&gt;</span></span></div><span class="next button">&gt;</span></header>
<div class="container">
    <div class="labels"></div>
    <div class="days"></div>
</div>
`;

    let Localization = {
        'days':['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
        'months':['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    };

    window.customElements.define('webc-calendar', Calendar);
})();
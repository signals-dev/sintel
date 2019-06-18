import * as pip from '../services/pip-client';
import * as ko from 'knockout';
import * as _ from 'lodash';
import * as RSI from '../services/rest-server.interface';
import dataProcessor from '../services/data-processor';
import { LineChartDataEle } from './vis/data.interface';
import { LineChartCtx } from './vis/linechart-ctx';
import { LineChartFocus } from './vis/linechart-focus';
import { PeriodChart} from './vis/period-chart';


interface CtxCharts {
    [index: string]: LineChartCtx;
}

interface PeriodCharts {
    [index: string]: PeriodChart;
}

class Content {

    public ctxs = ko.observableArray<string>([]);
    public focus = ko.observable<string>('');

    private data: LineChartDataEle[];

    private focusChart: LineChartFocus;
    private ctxCharts: CtxCharts = {};
    private periodCharts: PeriodCharts = {};

    private config = {
        speed: 500,   // box animation duration,
        ctxHeight: 410,
        focusHeight: 540,
        periodHeight: 960
    };

    constructor(eleId: string) {
        let self = this;

        // initialize Knockout Variables
        ko.applyBindings(self, $(eleId)[0]);

        // default select 0
        $('.chart-focus-container').height(self.config.focusHeight);
        $('.chart-ctx-container').height(self.config.ctxHeight);
        $('.pchart').height(self.config.periodHeight);
    }

    // handle events coming from other components
    public setupEventHandlers() {
        let self = this;

        pip.content.on('experiment:change', (exp: RSI.Experiment) => {
            self._ToggleLoadingOverlay();
            dataProcessor.loadData(exp).then((data: LineChartDataEle[]) => {
                self.data = data;
                self._ToggleLoadingOverlay();
                self.ctxs(_.map(data, d => d.dataset.name));
                if (self.focus() === '') {
                    self.focus(data[0].dataset.name);
                    $($(`.chart-context .title`)[0]).css('background-color', 'bisque');
                } else {
                    $($(`.chart-context [name=title-${self.focus()}]`)).css('background-color', 'bisque');
                }
                self._visualize();
            });
        });

        pip.content.on('ctx:brush', msg => {
            self.focusChart.trigger('brush:update', msg);
            _.each(self.ctxCharts, ct => {
                ct.trigger('brush:update', msg.xMove);
            });
        });

        pip.content.on('focus:zoom', xMove => {
            _.each(self.ctxCharts, ct => {
                ct.trigger('brush:update', xMove);
            });
        });

        pip.content.on('event:update', () => {
            self.focusChart.trigger('event:update');
            _.each(self.ctxCharts, ct => {
                ct.trigger('event:update');
            });
        });
        pip.content.on('event:modify', (evt) => {
            self.focusChart.trigger('event:modify', evt);
        });
    }


    // the following public methods are triggered by user interactions

    public selectCtx(name) {
        let self = this;
        self.focus(name);
        let d = _.find(self.data, o => o.dataset.name === name);

        // update focus
        self.focusChart.trigger('data:update', [d]);
        ($(`a[href="#year"]`) as any).tab('show');

        // update period
        self.periodCharts['year'].trigger(
            'update',
            [{
                name: d.dataset.name,
                info: d.period
            }]
        );
        $(`.chart-context .title`).css('background-color', 'white');
        // console.log($(`.chart-context [name=title-${name}]`));
        $(`.chart-context [name=title-${name}]`).css('background-color', 'bisque');
    }

    public showMissing() {
        let self = this;
        _.each(self.periodCharts, ct => {
            ct.option.missing = !ct.option.missing;
            let _duration = ct.option.duration;
            ct.option.duration = 0;
            ct.trigger('update', null);
            ct.option.duration = _duration;

        });
    }

    public backward() {
        if ($('#year').hasClass('active')) {
            return;
        } else if ($('#month').hasClass('active')) {
            ($(`a[href="#year"]`) as any).tab('show');
        } else if ($(`#day`).hasClass('active')) {
            ($(`a[href="#month"]`) as any).tab('show');
        }
    }

    public showPrediction() {
        this.focusChart.trigger('showPrediction');
    }

    public addEventMode() {
        this.focusChart.trigger('addEventMode');
    }

    public zoomPanMode() {
        this.focusChart.trigger('zoomPanMode');
    }

    private _visualize() {
        let self = this;
        let data = self.data;

        // get common x domain
        let mmin = Number.MAX_SAFE_INTEGER;
        let mmax = Number.MIN_SAFE_INTEGER;
        _.each(data, d => {
            let st = _.first(d.timeseries)[0];
            let ed = _.last(d.timeseries)[0];
            mmin = mmin > st ? st : mmin;
            mmax = mmax < ed ? ed : mmax;
        });
        let xDomain: [number, number] = [mmin, mmax];

        if (_.isUndefined(self.focusChart)) {
            // plot context chart
            for (let i = 0; i < data.length; i++) {
                let dName = data[i].dataset.name;
                self.ctxCharts[dName] = new LineChartCtx(
                    $(`.chart-context [name="${dName}"]`)[0],
                    [data[i]],
                    {
                        height: 40,
                        offset: 0,
                        xAxis: false,
                        yAxis: false,
                        margin: { top: 5, right: 35, bottom: 5, left: 40 },
                        xDomain: xDomain
                    }
                );
            }

            // plot focused chart
            self.focusChart = new LineChartFocus(
                $('.chart-focus')[0],
                [data[0]],   // By default, plot the first one
                {
                    height: 480,
                    offset: 0,
                    xAxis: true,
                    yAxis: true,
                    margin: { top: 5, right: 35, bottom: 30, left: 40 },
                    xDomain: xDomain
                }
            );

            // plot year period chart
            self.periodCharts['year'] = new PeriodChart(
                $('#year')[0],
                [{
                    name: data[0].dataset.name,
                    info: data[0].period
                }],
                {
                    width: $('.pchart').width() - 60,
                    nCol: 2
                }
            );

            // plot month period chart
            self.periodCharts['month'] = new PeriodChart(
                $('#month')[0],
                [{
                    name: data[0].dataset.name,
                    info: data[0].period[0].children
                }],
                {
                    width: $('.pchart').width() - 60,
                    nCol: 4
                }
            );

            // plot day period chart
            self.periodCharts['day'] = new PeriodChart(
                $('#day')[0],
                [{
                    name: data[0].dataset.name,
                    info: data[0].period[0].children[0].children
                }],
                {
                    width: $('.pchart').width(),
                    nCol: 7
                }
            );
        } else {
            let d = _.find(self.data, o => o.dataset.name === self.focus());

            // update focus
            self.focusChart.option.xDomain = xDomain;
            self.focusChart.trigger('data:update', [d]);

            // update context
            for (let i = 0; i < data.length; i++) {
                let dName = data[i].dataset.name;
                self.ctxCharts[dName].trigger('data:update', [d]);
            }

            // update period-chart
            ($(`a[href="#year"]`) as any).tab('show');
            self.periodCharts['year'].trigger(
                'update',
                [{
                    name: d.dataset.name,
                    info: d.period
                }]
            );
        }

        // ******* handle chart events *********
        self.periodCharts['year'].on('select', (o) => {
            let newData = [];
            let d = _.find(data, dd => dd.dataset.name === self.focus());
            for (let i = 0; i < d.period.length; i++) {
                if (d.period[i].name !== o.name) { continue; }
                newData.push({
                    name: d.dataset.name,
                    info: d.period[i].children
                });
            }
            console.log(newData);
            // switch tab
            ($('a[href="#month"]') as any).tab('show');

            // update
            self.periodCharts['month'].trigger('update', newData);
        });

        self.periodCharts['month'].on('select', (o) => {
            let newData = [];
            let d = _.find(self.data, dd => dd.dataset.name === self.focus());
            for (let i = 0; i < d.period.length; i++) {
                if (d.period[i].name !== o.parent.name) { continue; }
                for (let j = 0; j < d.period[i].children.length; j++) {
                    if (d.period[i].children[j].name !== o.name) { continue; }
                    newData.push({
                        name: d.dataset.name,
                        info: d.period[i].children[j].children
                    });
                }
            }
            // switch tab
            ($('a[href="#day"]') as any).tab('show');

            // update
            self.periodCharts['day'].trigger('update', newData);
        });
    }

    private _ToggleLoadingOverlay() {
        if ($('.timeseries-overview>.overlay').hasClass('hidden')) {
            $('.timeseries-overview>.overlay').removeClass('hidden');
            $('.timeseries-detail>.overlay').removeClass('hidden');
            $('.period-view>.overlay').removeClass('hidden');
        } else {
            $('.timeseries-overview>.overlay').addClass('hidden');
            $('.timeseries-detail>.overlay').addClass('hidden');
            $('.period-view>.overlay').addClass('hidden');
        }
    }
}

export default Content;

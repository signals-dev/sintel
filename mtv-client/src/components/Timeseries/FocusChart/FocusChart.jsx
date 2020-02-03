import * as d3 from 'd3';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { FocusChartConstants } from './Constants';
import { setTimeseriesPeriod } from '../../../model/actions/datarun';
import { getDatarunDetails, getSelectedPeriodRange } from '../../../model/selectors/datarun';
import './FocusChart.scss';

const { MIN_VALUE, MAX_VALUE, TRANSLATE_TOP, TRANSLATE_LEFT, DRAW_EVENTS_TIMEOUT, CHART_MARGIN } = FocusChartConstants;

class FocusChart extends Component {
  constructor(...args) {
    super(...args);

    this.state = {
      width: 0,
      height: 0,
    };

    this.zoomHandler = this.zoomHandler.bind(this);
  }

  componentDidMount() {
    const { width, height } = this.getWrapperSize();
    const chart = d3.select('#focusChart');

    this.setState(
      {
        width,
        height,
        chart,
      },
      () => {
        this.drawChart();
      },
    );
  }

  componentDidUpdate(prevProps) {
    if (prevProps.datarun && prevProps.datarun.id !== this.props.datarun.id) {
      this.drawChart();
    }

    if (prevProps.periodRange.zoomValue !== this.props.periodRange.zoomValue) {
      this.updateChartOnBrush();
    }
  }

  getWrapperSize() {
    const wrapperOffsetMargin = 40;
    const wrapperHeight = document.querySelector('#content-wrapper').clientHeight;
    const overViewHeight = document.querySelector('#overview-wrapper').clientHeight;
    const height = wrapperHeight - (overViewHeight + TRANSLATE_TOP + wrapperOffsetMargin);
    const width = document.querySelector('.focus-chart').clientWidth;
    return { width, height };
  }

  getScale() {
    const { width, height } = this.state;
    const { timeSeries } = this.props.datarun;

    const [minTX, maxTX] = d3.extent(timeSeries, time => time[0]);
    const [minTY, maxTY] = d3.extent(timeSeries, time => time[1]);
    const drawableWidth = width - 2 * CHART_MARGIN - TRANSLATE_LEFT;
    const drawableHeight = height - 3.5 * CHART_MARGIN;

    const xCoord = d3.scaleTime().range([0, drawableWidth]);
    const yCoord = d3.scaleLinear().range([drawableHeight, 0]);

    const minX = Math.min(MIN_VALUE, minTX);
    const maxX = Math.max(MAX_VALUE, maxTX);

    const minY = Math.min(MIN_VALUE, minTY);
    const maxY = Math.max(MAX_VALUE, maxTY);

    xCoord.domain([minX, maxX]);
    yCoord.domain([minY, maxY]);

    return { xCoord, yCoord };
  }

  drawLine(data) {
    const { xCoord, yCoord } = this.getScale();

    const line = d3
      .line()
      .x(d => xCoord(d[0]))
      .y(d => yCoord(d[1]));

    return line(data);
  }

  drawAxis() {
    const { height } = this.state;
    const { xCoord, yCoord } = this.getScale();
    const isChartReady = document.querySelector('.chart-axis');
    const xAxis = d3.axisBottom(xCoord);
    const yAxis = d3.axisLeft(yCoord);

    const focusGroup = d3.select('.focus');

    const createAxis = () => {
      const axisG = focusGroup.append('g').attr('class', 'chart-axis');
      axisG
        .append('g')
        .attr('transform', `translate(0, ${height - 3.5 * CHART_MARGIN})`)
        .attr('class', 'axis axis--x')
        .call(xAxis);
      axisG
        .append('g')
        .attr('class', 'axis axis--y')
        .call(yAxis.ticks(5, ',f'));
    };

    const updateAxis = () => {
      focusGroup.select('.axis.axis--x').call(xAxis);

      focusGroup.select('.axis.axis--y').call(yAxis.ticks(5, ',f'));
    };

    if (isChartReady) {
      updateAxis();
    } else {
      createAxis();
    }
  }

  drawData() {
    const { width, height, chart } = this.state;
    const { datarun } = this.props;
    const isChartDataReady = document.querySelector('.chart-data');

    chart.attr('width', width).attr('height', height);

    const focusGroup = chart
      .append('g')
      .attr('class', 'focus')
      .attr('width', width - TRANSLATE_LEFT - 2 * CHART_MARGIN)
      .attr('transform', `translate(${TRANSLATE_LEFT}, ${CHART_MARGIN})`);

    const createChart = () => {
      const clipPath = focusGroup.append('defs');
      clipPath
        .append('clipPath')
        .attr('id', 'focusClip')
        .append('rect')
        .attr('width', width - TRANSLATE_LEFT - 2 * CHART_MARGIN)
        .attr('height', height);

      const chartLine = focusGroup
        .append('g')
        .attr('class', 'chart-data')
        .attr('clip-path', 'url(#focusClip)');

      chartLine
        .append('path')
        .attr('class', 'chart-waves')
        .transition()
        .duration(DRAW_EVENTS_TIMEOUT)
        .attr('d', () => this.drawLine(datarun.timeSeries));
    };

    const updateChart = () => {
      d3.select('.chart-waves')
        .transition()
        .duration(DRAW_EVENTS_TIMEOUT)
        .attr('d', () => this.drawLine(datarun.timeSeries));
      this.resetZoom();
    };

    if (isChartDataReady === null) {
      createChart();
    } else {
      updateChart();
    }
  }

  drawEvents() {
    const { datarun } = this.props;
    const { timeSeries, eventWindows } = datarun;
    const chartData = d3.select('g.chart-data');
    chartData.selectAll('.line-highlight').remove();
    const drawHlEvent = event => {
      chartData
        .append('g')
        .attr('class', 'line-highlight')
        .append('path')
        .attr('class', 'evt-highlight')
        .transition()
        .duration(DRAW_EVENTS_TIMEOUT)
        .attr('d', this.drawLine(event));
    };

    setTimeout(() => {
      chartData.selectAll('.line-highlight').remove(); // to make sure all previous events are removed
      eventWindows.forEach(event => drawHlEvent(timeSeries.slice(event[0], event[1] + 1)));
      const { zoom, resetZoom } = this.addZoom();
      this.zoom = zoom;
      this.resetZoom = resetZoom;
    }, DRAW_EVENTS_TIMEOUT);
  }

  addZoom() {
    const { width, height, chart } = this.state;
    let zoomRect;
    const zoom = d3
      .zoom()
      .scaleExtent([1, Infinity])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .extent([
        [0, 0],
        [width, height],
      ])
      .on('zoom', this.zoomHandler);

    chart.selectAll('.zoom').remove();
    zoomRect = chart
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'zoom');

    zoomRect = d3.select('.zoom').call(zoom);

    const enableZoom = () => {
      zoomRect.attr('width', width);
      zoomRect.call(zoom);
    };

    const disableZoom = () => {
      zoomRect.attr('width', 0);
      zoomRect.on('.zoom', null);
    };

    let resetZoom = () => {
      zoomRect.call(zoom.transform, d3.zoomIdentity);
    };

    return { zoom, enableZoom, disableZoom, resetZoom };
  }

  zoomHandler() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush') {
      return;
    }
    const { xCoord } = this.getScale();
    let zoomValue = d3.event.transform;
    const eventRange = xCoord.range().map(zoomValue.invertX, zoomValue);
    const periodRange = {
      eventRange,
      zoomValue,
    };
    this.props.setPeriodRange(periodRange);
  }

  updateChartOnBrush() {
    const { chart } = this.state;
    const { xCoord, yCoord } = this.getScale();
    const { periodRange, datarun } = this.props;
    const { zoomValue } = periodRange;
    const { timeSeries, eventWindows } = datarun;
    const xCoordCopy = xCoord.copy();
    const xAxis = d3.axisBottom(xCoord);
    let events = [];
    const line = d3
      .line()
      .x(d => xCoord(d[0]))
      .y(d => yCoord(d[1]));

    d3.select('.zoom').call(this.zoom.transform, zoomValue);
    xCoord.domain(zoomValue.rescaleX(xCoordCopy).domain());

    d3.select('.axis.axis--x').call(xAxis);

    chart.select('.chart-waves').attr('d', () => line(timeSeries));

    eventWindows.forEach(event => events.push(timeSeries.slice(event[0], event[1] + 1)));

    chart.selectAll('.evt-highlight').each(function(value, index) {
      d3.select(this).attr('d', line(events[index]));
    });
  }

  drawChart() {
    this.drawData();
    this.drawAxis();
    this.drawEvents();
  }

  render() {
    return (
      <div className="focus-chart">
        <div style={{ height: '90px' }} /> {/** will be used soon */}
        <svg id="focusChart" />
      </div>
    );
  }
}

FocusChart.propTypes = {
  datarun: PropTypes.object,
  setPeriodRange: PropTypes.func,
  periodRange: PropTypes.array,
};

export default connect(
  state => ({
    datarun: getDatarunDetails(state),
    periodRange: getSelectedPeriodRange(state),
  }),
  dispatch => ({
    setPeriodRange: period => dispatch(setTimeseriesPeriod(period)),
  }),
)(FocusChart);

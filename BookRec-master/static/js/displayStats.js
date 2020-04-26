function plotChartsStats(data, id, title, xAxis, yAxis) {
    Highcharts.chart(id, {
        chart: {
            height: (7 / 8 * 100) + '%'
        },
        title: {
            text: title
        },

        tooltip: {
            formatter: function() {
                //console.log(this);
                return `
                <span> ${this.point.options.x.toFixed(2)} -  ${this.point.options.x2.toFixed(2)}</span> <br />
                <span style="color: ${this.color}">●</span> <span>${this.series.name}</span> : <b>${this.point.y}</b>
                `
            }
        },
        xAxis: [{
            title: false,
            alignTicks: false,
            max: xAxis.max,
        }, {
            title: { text: xAxis.title },
            alignTicks: false,
            tickInterval: xAxis.tickInterval || null,
            max: xAxis.max || null
        }],

        yAxis: [{
            title: false,
            max: yAxis.max,
            step: 20,
            tickInterval: 100

        }, {
            title: { text: 'Count' },
            max: yAxis.max,
            tickInterval: id == 'ratingsperbook'? 230: 50,
            startOnTick: false,
            showLastLabel: true,
            opposite: false
        }],

        plotOptions: {
            series: {
                color: '#239a3b'
            },
            histogram: {
                accessibility: {
                    pointDescriptionFormatter: function (point) {
                        var ix = point.index + 1,
                            x1 = point.x.toFixed(3),
                            x2 = point.x2.toFixed(3),
                            val = point.y;
                        return ix + '. ' + x1 + ' to ' + x2 + ', ' + val + '.';
                    }
                }
            }
        },

        legend: {
            enabled: false,
        },
        series: [{
            name: title,
            type: 'histogram',
            xAxis: 1,
            yAxis: 1,
            baseSeries: 's1',
            zIndex: -1
        }, {

            data: data,
            visible: false,
            id: 's1',

        }]
    });
}

function init() {
    /*$.ajax({
        type: "GET",
        dataType: "json",
        url: "/api/stat/ratingperuser",
        success: function (result) {
            // console.log(result);
            const arr = Object.keys(result).map(e => result[e]);
            plotChartsStats(arr,
                'ratingperuser',
                'Number of ratings per user',
                {
                    max: 200,
                    title: 'Number of ratings per user'
                }, {
                max: 650
            });
            // console.log(JSON.stringify(arr));
        }
    });*/

    $.ajax({
        type: "GET",
        dataType: "json",
        url: "/api/stat/meanratingperuser",
        success: function (result) {
            const arr = Object.keys(result).map(e => result[e]);
            plotChartsStats(arr,
                'meanratingperuser',
                'Mean user rating',
                {
                    max: 5,
                    tickInterval: 1,
                    title: 'Mean rating per user'
                }, {
                max: 150
            });
            // console.log(JSON.stringify(arr));
        }
    });

    $.ajax({
        type: "GET",
        dataType: "json",
        url: "/api/stat/ratingperbook",
        success: function (result) {
            const arr = Object.keys(result).map(e => result[e]);
            plotChartsStats(arr,
                'ratingsperbook',
                'Number of Ratings per book',
                {
                    tickInterval: 500,
                    max: 2000,
                    title: 'Number of ratings per book'
                }, {
                max: 1600
            });
            // console.log(JSON.stringify(arr));
        }
    });

    $.ajax({
        type: "GET",
        dataType: "json",
        url: "/api/stat/meanratingperbook",
        success: function (result) {
            const arr = Object.keys(result).map(e => result[e]);
            plotChartsStats(arr,
                'meanratingsperbook',
                'Mean Ratings per book',
                {
                    tickInterval: 1,
                    max: 5,
                    title: 'Mean rating per book'
                }, {
                max: 250
            });
            // console.log(JSON.stringify(arr));
        }
    });
}

init();
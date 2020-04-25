function add_title(title, author) {
    $("#titletext").html("");
    $('#vis').after('<h3 id = "titletext">Details about: "' + title + '" by <em>' + author + '</em></h3>');
}

function packedBubble(data, type) {
    const modal_ht = $(".modal-header").outerHeight() + $(".nav-tabs").outerHeight();
    const height = $(window).height() - modal_ht - 120;

    if (type == 'ratings') {
        $("#ratings_based").empty();
        var svg = d3.select("#ratings_based");
    }
    else if (type == 'authors') {
        $("#authors_based").empty();
        var svg = d3.select("#authors_based");
    }

    svg.attr("width", height);
    svg.attr("height", height);

    var margin = 20,
        diameter = +svg.attr("height") / 1,
        g = svg.append("g").attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

    var color = d3.scaleLinear()
        .domain([-1, 5])
        .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
        .interpolate(d3.interpolateHcl);

    var pack = d3.pack()
        .size([diameter - margin, diameter - margin])
        .padding(2);


    var root = d3.hierarchy(data[0])
        .sum(function (d) { return d.value; })
        .sort(function (a, b) { return b.value - a.value; });

    console.log(root)
    var focus = root,
        nodes = pack(root).descendants(),
        view;

    var circle = g.selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("class", function (d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
        .style("fill", function (d) { return d.children ? color(d.depth) : null; })
        .on("click", function (d) {
            console.log(d3.select(this).attr("class"))
            if ( d3.select(this).attr("class") === 'node node--leaf')
                //return;
            if (focus !== d) zoom(d)
            d3.event.stopPropagation();
        })
        /*.on("dblclick", function(d) {
            console.log(d);
        })*/
        ;

    d3.selectAll(".node--leaf").on("dblclick", function (d) {
        console.log(d);
        const { data } = d;
        $('#bookDetails .book-stats').removeClass('hidden');
        // Remove Initial Text
        $('#initial-text').remove();
        $('a[href="#bookDetails"]').trigger('click');

        // Add Book name
        $('.book-name .book-title').empty().append(d.name);

        add_title(data.name, data.authorname);
        get_heatmap(data.asin, data.name);
        get_ratings(data.asin, data.name);
    })

    var text = g.selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("class", "label")
        .style("fill-opacity", function (d) { return d.parent === root ? 1 : 0; })
        .style("display", function (d) { return d.parent === root ? "inline" : "none"; })
        .text(function (d) {
            if (d.data.name === 'Similar User' || d.data.name === 'Current User') {
                return d.data.name;
            }
            return d.data.name.length > 10 ? d.data.name.substr(0, 7) + '..' : d.data.name;
        });

    var node = g.selectAll("circle,text");

    svg
        //.style("background", color(-1))
        .on("click", function (e) { console.log('event', d3.event); zoom(root); });

    zoomTo([root.x, root.y, root.r * 2 + margin]);
    g.selectAll("text").filter(e => e !== undefined && (Number.isInteger(e.data.name))).attr("class", "label label-big");

    function zoom(d) {
        var focus0 = focus; focus = d;
        const div = d3.select("#tooltip");

        var transition = d3.transition()
            .duration(d3.event.altKey ? 7500 : 750)
            .tween("zoom", function (d) {
                var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
                return function (t) { zoomTo(i(t)); };
            });

        transition.selectAll("text")
            .filter(function (d) { return (typeof d !== "undefined") ? d.parent === focus || this.style.display === "inline" : ''; })
            .style("fill-opacity", function (d) { return d.parent === focus ? 1 : 0; })
            .attr("class", "label-child")
            .on("start", function (d) { if (d.parent === focus) this.style.display = "inline"; })
            .on("end", function (d) { if (d.parent !== focus) this.style.display = "none"; });

        d3.selectAll("text").on("mouseover", (d) => {
            //console.log(d)
            div.transition()
                .duration(200)
                .style("opacity", 1.0);
            div.html(d.data.name)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        }).on("mouseout", function (d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });

        setTimeout(() => {
            d3.selectAll('text').filter(e => e !== undefined && e.data && (Number.isInteger(e.data.name))).attr("class", "label label-big");


        }, 1000)
    }

    function zoomTo(v) {
        var k = diameter / v[2]; view = v;
        node.attr("transform", function (d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
        circle.attr("r", function (d) { return d.r * k; });
    }
}

$('.switch input').change(function () {
    $('#ratings_based, #authors_based').toggleClass('hidden');
    // need to replot the graph here
});
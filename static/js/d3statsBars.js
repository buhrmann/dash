//-------------------------------------------------------------------
// Create bar chart from json data
//-------------------------------------------------------------------

// Globals
var runs;
var byDate;
var selectedElem = null;

var data;
var x, x2, y, xlab, ylab, xAxis, yAxis;
var width, height;
var focus, bars;
var brush;

var statsTabParent = "#stats .textdata";

//----------------------------------------------------------------------
// Wrapper for all things to be constructed in the corresponding layout
//----------------------------------------------------------------------
barsFromStats = function(elem, d) {

    data = d;

    dateForm = d3.time.format("%Y-%m");
    data.forEach(function(d){ d.date = new Date(d.year, d.month-1); });

    stats = crossfilter(data);
    byDate = stats.dimension(function(d) { return d.date; });

    xlab = 'date';
    ylab = 'distance';

    datebars(elem, data, xlab, ylab);
}

//-------------------------------------------------------------------
// Bar chart for date indexed data
//-------------------------------------------------------------------
datebars = function(id, dat, xlab, ylab) {

    // Setup
    var outFormat = d3.time.format("%Y-%m-%d");
    var margin = {top: 10, right: 40, bottom: 100, left: 30};
    var margin2 = {top: 330, right: 40, bottom: 20, left: 30}
    width = 800 - margin.left - margin.right;
    height = 400 - margin.top - margin.bottom;
    var height2 = 400 - margin2.top - margin2.bottom;

    renderLabels = 0;
    include0 = true;

    // Create scales and axis
    // Add one day before and after first and last data point
    var first = d3.time.month.offset(dat[0][xlab], -1);
    var last  = d3.time.month.offset(dat[dat.length - 1][xlab], 1)
    var xdomain = [first, last]
    x = d3.time.scale().domain(xdomain).rangeRound([0, width]); 

    if (include0)
        var ydomain = [0, d3.max(dat, function(d) { return d[ylab]; })];
    else
        var ydomain = d3.extent(dat, function(d) { return d[ylab]; });
    y = d3.scale.linear().domain(ydomain).nice().range([height, 0]);

    // Create axes
    xAxis = d3.svg.axis()
        .scale(x).orient("bottom")
        //.tickFormat(d3.time.format("%d %b"));

    yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    // Create svg container for chart
    var svg = d3.select(id).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    // Need clip path with brushable chart
    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    focus = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Append axes
    focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);  

    focus.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("Distance");

    // Create tooltip
    tip = d3.tip().attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) { return d['distance'].toFixed(2) + " km"; });

    focus.call(tip);          

    // Create marks
    bars = focus.selectAll(".bar")
        .data(dat, function(d) {return d[xlab]; })
        .enter().append("rect")
        .on('mouseover', function(d) { tip.show(d); hovered(d, d3.select(this)); } )
        .on('mouseout', tip.hide)
        .attr("clip-path", "url(#clip)");

    w = d3.scale.ordinal().domain(d3.time.months(xdomain[0], xdomain[1])).rangeRoundBands(x.range(), 0.2).rangeBand();
    bars.attr("x", function(d) { return x(d[xlab]); })
        .attr("y", function(d) { return y(d[ylab]); })
        .attr("height", function(d) { return height - y(d[ylab]); })
        .attr("width", w)
        .attr("class", "bar");  
    
    // context brush
    var context = 1;
    if (context){
        x2 = d3.time.scale().domain(xdomain).rangeRound([0, width]); 
        var y2 = d3.scale.linear().domain(y.domain()).nice().range([height2, 0]);

        var xAxis2 = d3.svg.axis().scale(x2).orient("bottom").tickFormat(d3.time.format("%d %b"));

        brush = d3.svg.brush().x(x2).on("brush", brushed);    

        initialBrushExtent = 12; // months
        brushlast = x.domain()[1];
        brushfirst = d3.time.month.offset(brushlast, -initialBrushExtent);
        brush.extent([brushfirst, brushlast]);

        var context = svg.append("g")
            .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

        context.append("g")
            .attr("class", "x brush")
            .call(brush)
            .selectAll("rect")
            .attr("y", -6)
            .attr("height", height2 + 7);

        context.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height2 + ")")
            .call(xAxis2);

        var bars2 = context.selectAll(".bar")
            .data(dat)
            .enter().append("rect");

        bars2.attr("x", function(d) { return x2(d[xlab]); })
            .attr("y", function(d) { return y2(d[ylab]); })
            .attr("height", function(d) { return height2 -  y2(d[ylab]); })
            .attr("width", w)
            .attr("class", "bar");      

        // First update with initial extent
        brushed(dat);
    }

    // Select last run initially
    hovered(dat[dat.length - 1], null);
}

//-------------------------------------------------------------------
// Select run by hovering over bar and present detail information
//-------------------------------------------------------------------
function hovered(d, elem) {

    if(elem != selectedElem)
    {
        if(selectedElem != null)
            selectedElem.classed("selected", false);

        elem.classed("selected", true);
        selectedElem = elem;
    }
}

//-------------------------------------------------------------------
// Brushing
//-------------------------------------------------------------------
function brushed() {
    byDate.filterRange(brush.extent());     
    interval = byDate.top(Infinity);

    xdomain = brush.empty() ? x2.domain() : brush.extent();
    x.domain(xdomain);

    if (include0)
        ydomain = [0, d3.max(interval, function(d) { return d[ylab]; })];
    else
        ydomain = d3.extent(interval, function(d) { return d[ylab]; });
    y.domain(ydomain).nice();


    w = d3.scale.ordinal().domain(d3.time.months(xdomain[0], xdomain[1])).rangeRoundBands(x.range(), 0.2).rangeBand();

    bars = focus.selectAll(".bar").data(interval, function(d) {return d[xlab]; });

    bars.attr("x", function(d) { return x(d[xlab]) ; })
        .attr("width", w);

    bars.transition().duration(200)
        .attr("height", function(d) { return height - y(d[ylab]); })
        .attr("y", function(d) { return y(d[ylab]); })

    bars.enter().append("rect")
        .attr("x", function(d) { return x(d[xlab]); })
        .attr("y", function(d) { return y(d[ylab]); })
        .attr("height", function(d) { return height - y(d[ylab]); })
        .attr("width", w)
        .attr("class", "bar")
        .on('mouseover', function(d) { tip.show; hovered(d, d3.select(this)); } );          

    bars.exit().remove();


    focus.select(".x.axis").call(xAxis);
    focus.select(".y.axis").call(yAxis);
}


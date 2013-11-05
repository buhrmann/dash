//-------------------------------------------------------------------
// Create bar chart from json data
//-------------------------------------------------------------------

// Globals
var runs;
var byDate;
var selectedElem = null;
var dates = {};
var monthStr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

barsFromJson = function(elem, data) {

	data.forEach(function(d){ d.date = dateFormat.parse(d.date); });

	// Data comes in sorted by date !
	nestedDates = d3.nest()
		.key(function(d) { return d.date.getFullYear(); })
		.key(function(d) { return d.date.getMonth(); })
		.rollup(function(leaves) { return leaves.length > 0; })
		.map(data, d3.map);	

	nestedDates.forEach(function(year, months) {
    	dates[year] = months.keys().map(function(d) { return monthStr[parseInt(d)]; });
	});

	//d3.select("#date-selector").append

	runs = crossfilter(data);
	byDate = runs.dimension(function(d) { return d.date; });

	datebars(elem, data, 'date', 'distance');	
}

//-------------------------------------------------------------------
// Create horizontal lines at y values given in arr
//-------------------------------------------------------------------
gridlines = function(elem, arr, y, x1, x2){
	var lines = elem.selectAll(".gridline").data(arr);

	lines.attr({"y1" : function(d){ return y(d);},
            	"y2" : function(d){ return y(d);}});

	lines.enter().append("line")
        .attr(
        {
        	"class" : "gridline",
            "x1" : x1,
            "x2" : x2,
            "y1" : function(d){ return y(d);},
            "y2" : function(d){ return y(d);},
            "fill" : "none",
            "shape-rendering" : "crispEdges",
            "stroke" : "red",
            "stroke-width" : "1px"
        });

    mlab = elem.selectAll(".meanLabel").data(arr);
	mlab.attr("y", y(arr[0]))
		.attr("x", x2);

	mlab.enter().append("text")
		.attr("class", "meanLabel")
		.style("text-anchor", "end")
		.style("fill", "red")
		.text("mean")
		.attr("y", y(arr[0]))
		.attr("dy", -4)
		.attr("x", x2);

		  

   lines.exit().remove();
}

//-------------------------------------------------------------------
// Bar chart for date indexed data
//-------------------------------------------------------------------
datebars = function(id, dat, xlab, ylab) {

	// Setup
	var outFormat = d3.time.format("%Y-%m-%d");
	var margin = {top: 10, right: 40, bottom: 100, left: 30};
	var margin2 = {top: 430, right: 40, bottom: 20, left: 30}
	var width = 900 - margin.left - margin.right;
	var height = 500 - margin.top - margin.bottom;
	var height2 = 500 - margin2.top - margin2.bottom;

	renderLabels = 0;
	include0 = true;

	var statsTabParent = "#stats .textdata";
	var detailTabParent = "#detail .textdata";
	var listTabParent = "#table .textdata";

	// Create scales and axis
	// Add one day before and after first and last data point
	var domain = d3.extent(dat, function(d) { return d[xlab]; });	
	var first = d3.time.day.offset(dat[0][xlab], -1);
	var last = d3.time.day.offset(dat[dat.length - 1][xlab], 1)
	domain = [first, last]
	var x = d3.time.scale().domain(domain).nice().rangeRound([0, width]); 

	if (include0)
		var ydomain = [0, d3.max(dat, function(d) { return d[ylab]; })];
	else
		var ydomain = d3.extent(dat, function(d) { return d[ylab]; });
	var y = d3.scale.linear().domain(ydomain).nice().range([height, 0]);

	// Create axes
	var xAxis = d3.svg.axis()
		.scale(x).orient("bottom")
		.tickFormat(d3.time.format("%d %b"));

	var yAxis = d3.svg.axis()
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

	var focus = svg.append("g")
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
	var bars = focus.selectAll(".bar")
		.data(dat, function(d) {return d[xlab]; })
		.enter().append("rect")
		.on('mouseover', function(d) { tip.show(d); hovered(d, d3.select(this)); } )
		.on('mouseout', tip.hide)
		.on('click', function(d) { location.href=outFormat(d.date);})
		.attr("clip-path", "url(#clip)");

	var N = d3.time.days(domain[0], domain[1]).length;
	var w = (width / N) - 2;
	if(w < 2) w = 2;
	bars.attr("x", function(d) { return x(d[xlab]) - w/2; })
		.attr("y", function(d) { return y(d[ylab]); })
		.attr("height", function(d) { return height - y(d[ylab]); })
		.attr("width", w)
		.attr("class", "bar");	
	
	// context brush
	var context = 1;
	if (context){
		var x2 = d3.time.scale().domain(domain).nice().rangeRound([0, width]); 
		var y2 = d3.scale.linear().domain(y.domain()).nice().range([height2, 0]);

		var xAxis2 = d3.svg.axis().scale(x2).orient("bottom").tickFormat(d3.time.format("%d %b"));

		var brush = d3.svg.brush().x(x2).on("brush", brushed);    

		initialBrushExtent = 3; // months
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

		bars2.attr("x", function(d) { return x2(d[xlab]) - w/2; })
			.attr("y", function(d) { return y2(d[ylab]); })
			.attr("height", function(d) { return height2 -  y2(d[ylab]); })
			.attr("width", w)
			.attr("class", "bar");	    

		// Create table containers for pushing data into
		emptyTable(statsTabParent, true, "statsTable", "table table-condensed");
		emptyTable(detailTabParent, true, "detailTable", "table table-condensed");
		emptyTable(listTabParent, true, "listTable", "table table-striped table-hover table-condensed");

		// First update with initial extent
		brushed();
	}
	
	// Extract info for clicked bar
	function hovered(run, elem) {

		if(elem != selectedElem)
		{
			if(selectedElem != null)
				selectedElem.classed("selected", false);

			elem.classed("selected", true);
			selectedElem = elem;
		}

		// Update link to single run view
		var dateStr = dateFormat(run['date']);
		lnk = "View in more detail."
		d3.select("#detail a").text(lnk).attr("href", dateStr).style("cursor","pointer");

		// Update single run tabular widget
		tabulate([run], runMapper, runMapper.order, detailTabParent, false, false);
	}

	// Select last run initially
	hovered(dat[dat.length - 1], null);

	// Statistics helper
	function statistic(data, stat, vars){
		o = {};
		for (var i=0; i < vars.length; i++){
			o[vars[i]] = stat(data, function(d){ return d[vars[i]]});
		}
		return o;
	}

	// Brushing
	function brushed() {
		// Get data in brush range for statistics
		byDate.filterRange(brush.extent());		
		interval = byDate.top(Infinity);

		d3.select("#numruns").text(interval.length);
		d3.select("#totalkm").text(d3.sum(interval, function(d) {return d.distance;}).toFixed(2) );

		xdomain = brush.empty() ? x2.domain() : brush.extent();
		xdomain[0] = d3.time.day.offset(xdomain[0], -1);
		xdomain[1] = d3.time.day.offset(xdomain[1], 1);
		x.domain(xdomain);

		if (include0)
			ydomain = [0, d3.max(interval, function(d) { return d[ylab]; })];
		else
			ydomain = d3.extent(interval, function(d) { return d[ylab]; });
		y.domain(ydomain).nice();


		var N = d3.time.days(xdomain[0], xdomain[1]).length + 1;
		if (N > 0){			
			var w = (width / N) - 2;
			if(w < 2) w = 2;
			bars = focus.selectAll(".bar").data(dat, function(d) {return d[xlab]; });

			bars.attr("x", function(d) { return x(d[xlab]) - w/2; })
				.attr("width", w);

			bars.transition().duration(200)
				.attr("height", function(d) { return height - y(d[ylab]); })
				.attr("y", function(d) { return y(d[ylab]); })

			bars.enter().append("rect")
				.attr("x", function(d) { return x(d[xlab]) - w/2; })
				.attr("y", function(d) { return y(d[ylab]); })
				.attr("height", function(d) { return height - y(d[ylab]); })
				.attr("width", w)
				.attr("class", "bar")
				.on('mouseover', function(d) { tip.show; hovered(d, d3.select(this)); } );			

			bars.exit().remove();
		}

		focus.select(".x.axis").call(xAxis);
		focus.select(".y.axis").call(yAxis);
		
		// Create statistics
		if(interval.length > 0){
			var vars = ["duration", "distance", "avgspeed", "maxspeed", "temp"];
			var mus = statistic(interval, d3.mean, vars); mus["label"] = "Mean";
			var maxs = statistic(interval, d3.max, vars); maxs["label"] = "Max";
			var mins = statistic(interval, d3.min, vars); mins["label"] = "Min";
			stats = [mus, mins, maxs];

			tabulate(stats, runMapper, runMapper.statsorder, statsTabParent, true, true);
			//tabulate(stats, runMapper, runMapper.statsorder, statsTabParent);

			var listTab = tabulate(interval, runMapper, runMapper.order, listTabParent);
			// Add linking behaviour
			dateIdx = runMapper.order.indexOf("date");
	    	listTab.selectAll("tr")
	    		.on('click', function(d) { location.href=d[dateIdx];})
	    		.on('mouseover', function(d) { d3.select(this).style("cursor", "pointer"); } );

			//listTab.selectAll("tbody tr") 
        	//	.sort(function(a, b) { return d3.descending(a[1], b[1]); });


			// Grid lines
			gridlines(focus, [mus['distance']], y, 0, width);
		}
	} // brushed()
}


//-------------------------------------------------------------------
// Bar chart for linear or ordinal data
//-------------------------------------------------------------------
bars = function(id, dat, scaleType) {

	renderLabels = 0

	// Create scales and axis
	var x;
	if (scaleType == "linear"){
		x = d3.scale.linear()
			.domain([0, d3.max(dat, function(d) { return d[0]; })])
			.range([0, width]); 
	}
	else if (scaleType == "ordinal"){
		x = d3.scale.ordinal()
			.domain(dat.map(function(d) { return d[0]; }))
			.rangeRoundBands([0, width], 0.1);	    
	}

	var y = d3.scale.linear()
		.domain([0, d3.max(dat, function(d) { return d[1]; })])
		.nice()
		.range([height, 0]);

	// Create axes
	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom");

	if (scaleType == "time")
		xAxis.tickFormat(d3.time.format("%d %b"));

	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left");

	// Create svg container
	var svg = d3.select(id).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Append axes
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis);

	// rotate axis labels
	if (scaleType == "time"){
		svg.selectAll(".x text")
		  .attr("transform", function(d) {
			 return "translate(" + this.getBBox().height*-2 + "," + this.getBBox().height + ")rotate(-45)";
		 });	    
	}

	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis)
		.append("text")
		  .attr("transform", "rotate(-90)")
		  .attr("y", 6)
		  .attr("dy", ".71em")
		  .style("text-anchor", "end")
		  .text("Distance");

	// tool-tip
	var tip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d) {
		return "<strong>Distance:</strong> <span style='color:red'>" + Math.round(100*d[1])/100 + "</span>";
		});

	svg.call(tip);	    

	// Create marks
	var bars = svg.selectAll(".bar")
		.data(dat)
		.enter().append("rect")
		.on('mouseover', tip.show);
		//.on('mouseout', tip.hide);

	if (scaleType == "linear"){
		var w = (width / dat.length) - 2;
		bars.attr("x", function(d) {return x(d[0]) - w/2;})
			.attr("width", w)
			.attr("y", function(d) {return y(d[1]);})
			.attr("height", function(d) {return height - y(d[1]);})
			.attr("class", "bar");
	}
	else if (scaleType == "ordinal"){
		bars.attr("x", function(d) { return x(d[0]); })
			.attr("width", x.rangeBand())
			.attr("y", function(d) { return y(d[1]); })
			.attr("height", function(d) { return height - y(d[1]);})
			.attr("class", "bar")
	}

	// Create labels
	if (renderLabels) {

		var labels = svg.selectAll(".text")
		   .data(dat)
		   .enter().append("text");

		labels.text(function(d) { return Math.round(d[1] * 10) / 10; } )
			.attr("font-family", "sans-serif")
			.attr("font-size", "10px")
			.attr("fill", "white")
			.attr("text-anchor", "middle");

		if (scaleType == "linear"){
			var w = (width / dat.length) - 2;
			labels.attr("x", function(d) { return x(d[0]); })
				.attr("y", function(d) { return y(d[1]) + 12; })
		}
		else if (scaleType == "ordinal"){
			labels.attr("x", function(d) { return x(d[0]) + x.rangeBand()/2; })
				.attr("y", function(d) { return y(d[1]) + 12; })
		}
	}
}

// bars("#bars", ranheights(20), "ordinal")
// datebars("#datebars", randates(30), 'time', 'v')


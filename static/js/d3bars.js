//-------------------------------------------------------------------
// Create bar chart from json data
//-------------------------------------------------------------------

var runs;
var byDate;

barsFromJson = function(elem, data) {
	var dateFormat = d3.time.format.utc("%Y-%m-%d");
	data.forEach(function(d){ d.date = dateFormat.parse(d.date); });

	runs = crossfilter(data);
	byDate = runs.dimension(function(d) { return d.date; });

	datebars(elem, data, 'date', 'distance');	
}

//-------------------------------------------------------------------
// Bar chart for date indexed data
//-------------------------------------------------------------------
datebars = function(id, dat, xlab, ylab) {

	// Setup
	var outFormat = d3.time.format("%Y-%m-%d");
	var margin = {top: 10, right: 40, bottom: 100, left: 40};
	var margin2 = {top: 430, right: 40, bottom: 20, left: 40}
	var width = 700 - margin.left - margin.right;
	var height = 500 - margin.top - margin.bottom;
	var height2 = 500 - margin2.top - margin2.bottom;

	renderLabels = 0;
	include0 = true;

	// Create scales and axis
	var domain = d3.extent(dat, function(d) { return d[xlab]; });
	// Add one day before and after
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

	// Create container for textual information
	var monitor = d3.select(id).append("div")
		.attr("class", "monitor");

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

	// tool-tip
	var tip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d) {
		return "<span>" + Math.round(100*d[ylab])/100 + "</span> km";
		});

	focus.call(tip);	    

	// Create marks
	var bars = focus.selectAll(".bar")
		.data(dat, function(d) {return d[xlab]; })
		.enter().append("rect")
		.on('mouseover', tip.show)
		.on('mouseout', tip.hide)
		//.on('click', clicked)
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

		// Container for brushed statistics
		var tabCont = "#detail .textdata";
		var table = d3.select(tabCont).append("table");
		table.attr("class", "table");
		var thead = table.append("thead");	
		var tbody = table.append("tbody");
		thead.append("tr");			

		// First update with initial extent
		brushed();
	}


	// Create labels
	if (renderLabels) {

		var labels = svg.selectAll(".text")
		   .data(dat)
		   .enter().append("text");

		labels.text(function(d) { return Math.round(d['value'] * 10) / 10; } )
			.attr("font-family", "sans-serif")
			.attr("font-size", "10px")
			.attr("fill", "white")
			.attr("text-anchor", "middle");

		if (scaleType == "linear"){
			var w = (width / dat.length) - 2;
			labels.attr("x", function(d) { return x(d[xlab]); })
				.attr("y", function(d) { return y(d[ylab]) + 12; })
		}
		else if (scaleType == "ordinal"){
			labels.attr("x", function(d) { return x(d[xlab]) + x.rangeBand()/2; })
				.attr("y", function(d) { return y(d[ylab]) + 12; })
		}
	}

	
	// Extract info for clicked bar
	function clicked() {
		var bisectx = d3.bisector(function(d) { return d[xlab]; }).left;
		var mx = d3.mouse(this)[0];
		var vx = x.invert(mx);
		var ix = bisectx(dat, vx, 1);
		var d0 = Math.abs(vx - dat[ix-1][xlab]);
		var d1 = Math.abs(vx - dat[ix][xlab]);
		var d2 = Math.abs(vx - dat[ix+1][xlab]);
		var i = d0 < d1 ? (d0 < d2 ? ix-1 : ix+1) : (d1 < d2 ? ix : ix+1);

		info = "" + outFormat(dat[i][xlab]) + ". " + ylab + " = " + Math.round(100*dat[i][ylab])/100;
		monitor.text(info);
	}

	// Statistics
	function meanMax(data, label, varname){
		var mu = d3.mean(data, function(d) { return d[varname]; }).toFixed(2);
		var max = d3.max(data, function(d) { return d[varname]; }).toFixed(2);
		return [label,mu,max];
	}

	// Brushing
	function brushed() {
		byDate.filterRange(brush.extent());
		
		interval = byDate.top(Infinity);
		//console.warn(typeof(interval[0]['distance']));
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
				.on('mouseover', tip.show)
				.on('mouseout', tip.hide)
				.attr("x", function(d) { return x(d[xlab]) - w/2; })
				.attr("y", function(d) { return y(d[ylab]); })
				.attr("height", function(d) { return height - y(d[ylab]); })
				.attr("width", w)
				.attr("class", "bar");			

			bars.exit().remove();
		}

		focus.select(".x.axis").call(xAxis);
		focus.select(".y.axis").call(yAxis);
		
		// Create statistics
		if(interval.length > 0){
			var dateFormat = d3.time.format.utc("%H:%M:%S");
			duration = meanMax(interval, "Duration", 'duration');
			duration[1] = dateFormat(new Date(duration[1]*1000));
			duration[2] = dateFormat(new Date(duration[2]*1000));
			var tab = [
				meanMax(interval, "Distance (km)",'distance'),
				duration,
				meanMax(interval, "Avg Speed (km/h)", 'avgspeed'),
				meanMax(interval, "Max Speed (km/h)", 'maxspeed'),
				];
			var colnms = ["", "Mean", "Max"];
			tabulate(tab, colnms, tabCont);
		}
	} // brushed()
}

//-------------------------------------------------------------------
// Drop a data table to a html table
//-------------------------------------------------------------------
function tabulate(tab, colnms, id){
	var table = d3.select(id).select("table");
	var thead = table.select("thead");
	var tbody = table.select("tbody");

    // append the header row
    thead.select("tr").selectAll("th")
        .data(colnms)
        .enter()
        .append("th")
        .text(function(column) { return column; });

    // create a row for each object in the data
    var rows = tbody.selectAll("tr")
        .data(tab);

    rows.enter()
        .append("tr");

	 // create a cell in each row for each column
    var cells = rows.selectAll("td")
        .data(function(d) { return d;}) // Bind the ith row
        .text(function(d) { return d; });

   	cells.enter()
        .append("td")
        .text(function(d) { return d; });
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
		.on('mouseover', tip.show)
		.on('mouseout', tip.hide);

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


//-------------------------------------------------------------------
// Create bar chart with loaded json data
//-------------------------------------------------------------------
dualFromJson = function(id, data) {
	// Subtract mean from elevation ?
	//var mu = d3.mean(data, function(d) { return d['elevation']; });
	//data.forEach(function(d){ d['elevation'] = d['elevation'] - mu; })
	
	var dateFormat = d3.time.format.utc("%Y-%m-%d");
	data['date'] = dateFormat.parse(data['date']);

	// Create table containers for pushing data into
	var detailTabParent = "#detail .textdata";
	emptyTable(detailTabParent, true, "detailTable", "table");
	data.stats['date'] = data['date'];
	tabulate([data.stats], runMapper, runMapper.order, detailTabParent, false);

	// Draw main chart
	duallines('#duallines', data.gps, 'cumdist', 'speedsmooth', 'elevation');
}

//-------------------------------------------------------------------
// Bar chart for date indexed data
//-------------------------------------------------------------------
duallines = function(id, dat, xlab, y1lab, y2lab) {

	var margin = {top: 10, right: 40, bottom: 40, left: 40};
	var width = 800 - margin.left - margin.right;
	var height = 300 - margin.top - margin.bottom;
	yscalar = 1.0

	y2lab = typeof(y2lab) !== 'undefined' ? y2lab : null;

	var y1inc0 = 0
	var y2inc0 = 0

	var x = d3.scale.linear()
		.domain([0, d3.max(dat, function(d) { return d[xlab]; })])
		.range([0, width]);

	var y1min = y1inc0 ? 0 : d3.min(dat, function(d) { return d[y1lab]; });
	var y1 = d3.scale.linear()
		.domain( [y1min, d3.max(dat, function(d) { return d[y1lab]; }) ])
		.range([height, 0])
		.nice();

	var xAxis = d3.svg.axis().scale(x)		
	var y1Axis = d3.svg.axis().scale(y1).orient("left");		

	var line1 = d3.svg.line()
			.x(function(d) { return x(d[xlab]); })
			.y(function(d) { return y1(d[y1lab]); })

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

    svg.append("g")
		.attr("class", "y1 axis")
		.call(y1Axis)
		.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 6)
		.attr("dy", "0.71em")
		.style("text-anchor", "end")
		.text("Speed");		

	// Add the line path.
	svg.append("path")
	  .attr("class", "line line1")
	  .attr("d", line1(dat));


	// Create second axis and line if desired
	if (y2lab != null) {
		var y2min = y2inc0 ? 0 : d3.min(dat, function(d) { return d[y2lab]; });
		var y2 = d3.scale.linear()
			.domain([y2min, d3.max(dat, function(d) { return d[y2lab]; }) ])
			.range([height, height-(height/yscalar)])
			.nice(); 

		var y2Axis = d3.svg.axis().scale(y2).orient("right");


		var line2 = d3.svg.line()
				.x(function(d) { return x(d[xlab]); })
				.y(function(d) { return y2(d[y2lab]); })

		// An area generator, for the light fill.
		var area = d3.svg.area()
		    .interpolate("monotone")
		    .x(function(d) { return x(d[xlab]); })
		    .y0(height)
		    .y1(function(d) { return y2(d[y2lab]); });

		// Add the area path.
	  	svg.append("path")
	      .attr("class", "area")
	      .attr("d", area(dat));

		svg.append("g")
			.attr("class", "y2 axis")
			.attr("transform", "translate(" + width + ",0)")
			.call(y2Axis)
			.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 0)
			.attr("dy", "-0.71em")
			.style("text-anchor", "end")
			.text("Elevation");

		svg.append("path")
		  .attr("class", "line line2")
		  .attr("d", line2(dat));			
	}    

	// Add tool tip
	var focus = svg.append("g")
		.attr("class", "focus")
		.style("display", "none");

	var tip = focus.append("g")
		.attr("transform", "translate(0,-5)");

	tip.append("polygon")
		.attr("class", "tip")
		.attr("points", [[-5,-10],[5,-10],[0,0]])
		.attr("stroke-width", "2px");

	tip.append("rect")
		.attr("class", "tip")
		.attr("width", 60)
		.attr("height", 25)
		.attr("rx", 2)
		.attr("ry", 2)
		.attr("x", "-30")
		.attr("y", "-35");

	tip.append("text")
		.attr("class", "tip")
		.attr("y", "-22.5")
		.attr("text-anchor", "middle")
		.attr("alignment-baseline", "middle"); 

	// Track mouse position on chart
	svg.append("rect")
		.attr("class", "trackpad")
		.attr("width", width)
		.attr("height", height)
		.on("mouseover", function() { focus.style("display", null); })
		.on("mouseout", function() { focus.style("display", "none"); })		
		.on("mousemove", mousemove);		     

	// Implement tool tip tracking
	var bisectx = d3.bisector(function(d) { return d[xlab]; }).left;
	function mousemove(){
		var mx = d3.mouse(this)[0];
		var my = d3.mouse(this)[1];
		var xv = x.invert(mx);
		var ix = bisectx(dat, xv, 1);
		var ty, val;
		var dy1 = dat[ix][y1lab]; 
		if (y2lab != null){						
			var dy2 = dat[ix][y2lab]; 
			var showy1 = Math.abs(my - y1(dy1)) < Math.abs(my - y2(dy2)) ? 1 : 0;
			ty = showy1 ? y1(dy1) : y2(dy2);
			val = showy1 ? dy1 : dy2;
		} else {
			ty = y1(dy1);
			val = dy1;
		}
		svg.select("g.focus").attr("transform", "translate(" + mx + "," + ty + ")");
		svg.select("text.tip").text(Math.round(100*val)/100);
	}
}

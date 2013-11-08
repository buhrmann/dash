var data;
var vars = ["distance", "avgspeed", "duration", "maxspeed", "temp"];
var xLabSel = vars[0];
var yLabSel = vars[1];
var zLabSel = vars[2];
var cLabSel = vars[4];

var selectedElem = null;
var detailTabParent = "#detail .textdata";

// Setup
var includeY0 = false;
var includeX0 = false;
var margin = {top: 10, right: 40, bottom: 40, left: 30};
var width = 800 - margin.left - margin.right;
var height = 400 - margin.top - margin.bottom;

//-------------------------------------------------------------------
// Menu for variable varid with "selected" element selected by default
//-------------------------------------------------------------------
buildDropDown = function(varid, selected, label){

	d3.select(".varselector").append("div")
		.attr("class", "col-md-2")
		.attr("style", "margin-bottom:20px;")
		.text(label)
		.append("div")
			.attr("class", "select-style ")
			.append("select")
				.attr("id", varid)
			    .on("change", selectVars)
				.selectAll("option")
				.data(vars).enter().append("option")
				    .attr("value", function(d){ return d; }) /* Optional */
				    .attr("selected", function(d) { if (d==selected) return "selected";})
				    .text(function(d){ return runMapper[d]["label"]; });
}

//-------------------------------------------------------------------
// Scatter plot with regression line
//-------------------------------------------------------------------
scatterFromJson = function(elem, dat) {

	data = dat;
	data.forEach(function(d){ d.date = dateFormat.parse(d.date); });
	data.forEach(function(d){ d.duration = d.duration / 3600; });

	buildDropDown(0, xLabSel, "x-Axis");
	buildDropDown(1, yLabSel, "y-Axis");
	buildDropDown(2, zLabSel, "Size");
	buildDropDown(3, cLabSel, "Color");

	scatter(elem, data, xLabSel, yLabSel, zLabSel);	
}

//-------------------------------------------------------------------
// 
//-------------------------------------------------------------------
selectVars = function(){
	var varid = this.id;
	var val = this.options[this.selectedIndex].value;
	if(varid == 0)
		xLabSel = val;
	else if(varid == 1)
		yLabSel = val;
	else if(varid == 2)
		zLabSel = val;
	else if(varid == 3)
		cLabSel = val;

	updateScatter();
}

//-------------------------------------------------------------------
// Array helpers
//-------------------------------------------------------------------
arrayForKey = function(dat, key) {
	return d3.map(dat.map(function(d){ return d[key]; })).values();
}

vectorForKey = function(dat, key) {
	return Vector.create(arrayForKey(dat, key));
}

//-------------------------------------------------------------------
// Standard deviation
//-------------------------------------------------------------------
sd = function(x) {
  var n = x.length;

  if (n < 1) return NaN;
  if (n === 1) return 0;

  var mean = d3.mean(x),
      i = -1,
      s = 0;

  while (++i < n) {
    var v = x[i] - mean;
    s += v * v;
  }

  return Math.sqrt(s / n);
};

//-------------------------------------------------------------------
// Correlation coefficient
//-------------------------------------------------------------------
corr = function(x, y, meanx, meany, sdx, sdy) {
  //console.log(x);
  //console.log(y);

  var n = x.length;

  if (n < 1) return NaN;
  if (n === 1) return 0;

  var i = -1;
  var c = 0;

  // Mean of mean-adjusted variable multiple (dot product)
  while (++i < n) {
    c += (x[i] - meanx) * (y[i] - meany);
    //console.log(i, x[i], y[i]);
  }

  c /= n;

  return c / (sdx * sdy);
}


//-------------------------------------------------------------------
// Linear regression
//-------------------------------------------------------------------
linearRegression = function(dat, xlab, ylab) {
	
	var x = arrayForKey(dat, xlab);
	var y = arrayForKey(dat, ylab);
	var mux = d3.mean(x);
	var muy = d3.mean(y);
	var sdx = sd(x);
	var sdy = sd(y);
	console.log("LinReg Stats: ", mux, muy, sdx, sdy);

	var cor = corr(x, y, mux, muy, sdx, sdy);
	console.log("LinReg corr: ", cor);

	var b = cor * (sdy / sdx);
	var a = muy - (b * mux);
	console.log("LinReg factors: ", a,b);

	return [a,b];
}

//-------------------------------------------------------------------
// Draw line from intercept and slope
//-------------------------------------------------------------------
drawline = function(factors, x1, x2, xscale, yscale){

  	//console.log(factors);
	//line = d3.select("svg").select("g").append("line")
	line = d3.select("svg").select("g").selectAll(".line").data([{"dummy":1}]);
	
	// Update existing line
	line.attr(
	    {
	        "x1" : xscale(x1),
	        "x2" : xscale(x2),
	        "y1" : yscale(factors[0] + factors[1]*x1),
	        "y2" : yscale(factors[0] + factors[1]*x2),
    });

	// Create if it doesn't exist
	line.enter().append("line")
	    .attr(
	    {
	    	"class" : "line",
	        "x1" : xscale(x1),
	        "x2" : xscale(x2),
	        "y1" : yscale(factors[0] + factors[1]*x1),
	        "y2" : yscale(factors[0] + factors[1]*x2),
	        "fill" : "none",
	        "shape-rendering" : "crispEdges",
	        "stroke" : "red",
	        "stroke-width" : "1px"
    });
}

//-------------------------------------------------------------------
// Extract info for selected run
//-------------------------------------------------------------------
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
	d3.select("#detail a").text(lnk).attr("href", "runs/" + dateStr).style("cursor","pointer");

	// Update single run tabular widget
	tabulate([run], runMapper, runMapper.order, detailTabParent, false, false);
	}

//-------------------------------------------------------------------
// Update scatter chart
// In this case the data is not actually changing but only the axes,
// and therefore the position of dots in the chart
//-------------------------------------------------------------------
updateScatter = function() {

	if (includeX0)	
		xdomain = [0, d3.max(data, function(d) { return d[xLabSel]; })];
	else
		xdomain = d3.extent(data, function(d) { return d[xLabSel]; });
	var x = d3.scale.linear().domain(xdomain).nice().rangeRound([0, width]); 
	var xAxis = d3.svg.axis().scale(x).orient("bottom")

	if (includeY0)
		ydomain = [0, d3.max(data, function(d) { return d[yLabSel]; })];
	else
		ydomain = d3.extent(data, function(d) { return d[yLabSel]; });
	var y = d3.scale.linear().domain(ydomain).nice().range([height, 0]);
	var yAxis = d3.svg.axis().scale(y).orient("left");

	zdomain = d3.extent(data, function(d) { return d[zLabSel]; });
	var z = d3.scale.linear().domain(zdomain).range([2,10]);

	cdomain = d3.extent(data, function(d) { return d[cLabSel]; });
	var c = d3.scale.linear().domain(cdomain).range(['blue','red']);

	// update existing	
	var dots = d3.selectAll(".dot")
		.transition().duration(200)
		.attr("cx", function(d) { return x(d[xLabSel]); })
		.attr("cy", function(d) { return y(d[yLabSel]); })
		.attr("r", function(d) { return z(d[zLabSel]); });

	var dots = d3.selectAll(".dot")
	  	.style("fill", function(d) { return c(d[cLabSel]); });

	d3.select(".x.axis").call(xAxis)
		.select(".axisLabel")
		.text(runMapper[xLabSel]["label"]);

	d3.select(".y.axis").call(yAxis)
		.select(".axisLabel")
		.text(runMapper[yLabSel]["label"]);;

	factors = linearRegression(data, xLabSel, yLabSel);
	drawline(factors, x.domain()[0], x.domain()[1], x, y);
}

//-------------------------------------------------------------------
// Scatter selected variables and draws a regression line
//-------------------------------------------------------------------
scatter = function(id, dat, xlab, ylab, zlab) {

	// Create scales and axis
	if (includeX0)	
		xdomain = [0, d3.max(data, function(d) { return d[xLabSel]; })];
	else
		xdomain = d3.extent(data, function(d) { return d[xLabSel]; });
	var x = d3.scale.linear().domain(xdomain).nice().rangeRound([0, width]); 

	if (includeY0)
		var ydomain = [0, d3.max(dat, function(d) { return d[yLabSel]; })];
	else
		var ydomain = d3.extent(dat, function(d) { return d[yLabSel]; });
	var y = d3.scale.linear().domain(ydomain).nice().range([height, 0]);

	//zdomain = [0, d3.max(dat, function(d) { return d[zlab]; })];
	zdomain = d3.extent(dat, function(d) { return d[zLabSel]; });
	var z = d3.scale.linear().domain(zdomain).range([2,10]);

	cdomain = d3.extent(dat, function(d) { return d[cLabSel]; });
	var c = d3.scale.linear().domain(cdomain).range(['blue','red']);

	// Create axes
	var xAxis = d3.svg.axis().scale(x).orient("bottom")
	var yAxis = d3.svg.axis().scale(y).orient("left");

	// Create svg container for chart
	var svg = d3.select(id).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Append axes
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis)
		.append("text")
		  .attr("y", -8)
		  .attr("x", width)
		  .attr("class", "axisLabel")
		  .style("text-anchor", "end")
		  .text(runMapper[xlab]["label"]);

	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis)
		.append("text")
		  .attr("transform", "rotate(-90)")
		  .attr("y", 6)
		  .attr("dy", ".71em")
		  .attr("class", "axisLabel")
		  .style("text-anchor", "end")
		  .text(runMapper[ylab]["label"]);

	// Create tooltip
	tip = d3.tip().attr('class', 'd3-tip')
		.offset([-10, 0])
		.html(function(d) { return d[ylab].toFixed(2); });

	svg.call(tip);

	// Create marks
	var dots = svg.selectAll(".dot")
		.data(dat, function(d) { return d[xlab]; })
		.enter().append("svg:circle")
		.on('mouseover', function(d) { tip.show(d); hovered(d, d3.select(this)); } )
		//.on('mouseout', tip.hide)
		.attr("cx", function(d) { return x(d[xLabSel]); })
		.attr("cy", function(d) { return y(d[yLabSel]); })
		.attr("r", function(d) { return z(d[zLabSel]); })
	  	.style("fill", function(d) { return c(d[cLabSel]); })
		.attr("class", "dot");	

	// Select last run initially
	emptyTable(detailTabParent, true, "detailTable", "table table-condensed");	
	hovered(dat[dat.length - 1], null);

	// Draw regression line
	factors = linearRegression(dat, xLabSel, yLabSel);
	drawline(factors, x.domain()[0], x.domain()[1], x, y);
}

//-------------------------------------------------------------------
// Histogram for all variabels
//-------------------------------------------------------------------
histAll = function(id, dat) {

	dat.forEach(function(d){ d.duration = d.duration / 3600; });
	vars.forEach(function(v) { if (v != "maxspeed") hist(id, dat, v); });
}


//-------------------------------------------------------------------
// Histogram of selected variable
//-------------------------------------------------------------------
hist = function(id, dat, lab) {

	var marginHist = margin; marginHist.right = 10;
	var widthHist = width/4 - 3*marginHist.right;
	var heightHist = 120 - marginHist.top - marginHist.bottom;

	// A formatter for counts.
	var formatCount = d3.format(",.0f");

	//d1 = Math.round(d3.max(dat, function(d) { return d[lab]; }));
	//d0 = Math.round(d3.min(dat, function(d) { return d[lab]; }));
	domain = d3.extent(dat, function(d) { return d[lab]; });
	var x = d3.scale.linear().domain(domain).nice().range([0, widthHist]);

	// Generate a histogram using twenty uniformly-spaced bins.
	var data = d3.layout.histogram().bins(x.ticks(20)) (arrayForKey(dat, lab));

	var y = d3.scale.linear()
		.domain([0, d3.max(data, function(d) { return d.y; })]).nice()
    	.range([heightHist, 0]);

	var xAxis = d3.svg.axis().scale(x).orient("bottom");//.tickFormat(runMapper[lab]['mapper']);
	var yAxis = d3.svg.axis().scale(y).ticks(5).orient("left");

	var svg = d3.select(id).append("svg")
	    .attr("width", widthHist + marginHist.left + marginHist.right)
	    .attr("height", heightHist + marginHist.top + marginHist.bottom)
  		.append("g")
    		.attr("transform", "translate(" + marginHist.left + "," + marginHist.top + ")");

    // A container for each bar, which'll hold both the rect as well as txt
	var bars = svg.selectAll(".bar").data(data).enter().append("g")
	    .attr("class", "bar")
	    .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    bars.append("rect")
	    .attr("x", 1)
	    .attr("width", x(data[1].x) - x(data[0].x) - 1)
	    .attr("height", function(d) { return heightHist - y(d.y); }); 

	svg.append("g")
		.attr("class", "x axis")
	    .attr("transform", "translate(0," + heightHist + ")")
	    .call(xAxis)
	    .append("text")
		  .attr("y", 30)
		  .attr("x", widthHist/2)
		  .attr("class", "axisLabel")
		  .style("text-anchor", "middle")
		  .text(runMapper[lab]["label"]);;

	svg.append("g")
		.attr("class", "y axis")
	    .call(yAxis)
	    .append("text")
		  .attr("transform", "rotate(-90)")
		  .attr("y", 6)
		  .attr("dy", ".71em")
		  .style("text-anchor", "end")
		  .text("freq");
}

	
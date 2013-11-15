//-------------------------------------------------------------------
// Quick minimum overview of records
//-------------------------------------------------------------------
records = function(data) {

	data.forEach(function(d){ d.date = dateFormat.parse(d.date); });

	var total = d3.sum(data, function(d) { return d['distance']});	
	var farthest = d3.max(data, function(d) { return d['distance']});	
	var meanDist = d3.mean(data, function(d) { return d['distance']});	
	var meanSpeed = d3.mean(data, function(d) { return d['avgspeed']});	

	d3.select("#total").select(".number").text(total.toFixed(2));
	d3.select("#farthest").select(".number").text(farthest.toFixed(2));
	d3.select("#avgdist").select(".number").text(meanDist.toFixed(2));
	d3.select("#avgspeed").select(".number").text(meanSpeed.toFixed(2));


	// Build table
	var n = 3;
	emptyTable("#table", true, "listTable", "table table-hover table-condensed");
	var lastn = data.slice(data.length - 1-n, data.length - 1);
	console.log(lastn.length);
	var listTab = tabulate(lastn, runMapper, runMapper.order, "#table");
	// Add linking behaviour
	dateIdx = runMapper.order.indexOf("date");
	listTab.selectAll("tr")
		.on('click', function(d) { location.href = "runs/" + d[dateIdx]; })
   		.on('mouseover', function(d) { d3.select(this).style("cursor", "pointer"); } );
}
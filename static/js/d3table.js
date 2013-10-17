//-------------------------------------------------------------------
// Creates an empty table on to which data rows can be pushed/pulled
//-------------------------------------------------------------------
function emptyTable(parent, header, id, classname){

	var table = d3.select(parent).append("table");
	table.attr("class", classname).attr("id", id);
	if(header){
		table.append("thead").append("tr");	
	}
	table.append("tbody");
	return table;
}

//-------------------------------------------------------------------
// Drop data (tab) into a html table identified by parent id
//-------------------------------------------------------------------
function tabulate(tab, colnms, parent){
	var table = d3.select(parent).select("table");

    // append the header row
    if(colnms != null){
	    var thead = table.select("thead");
	    thead.select("tr").selectAll("th")
	        .data(colnms)
	        .enter()
	        .append("th")
	        .text(function(column) { return column; });
    }

    // create a row for each object in the data
    var tbody = table.select("tbody");
    var rows = tbody.selectAll("tr")
        .data(tab);

    rows.enter()
        .append("tr");

	 // Update cell by binding data in each row for each column
    var cells = rows.selectAll("td")
        .data(function(d) { return d; }) // Bind the ith row
        .text(function(d) { return d; });

   	cells.enter()
        .append("td")
        .text(function(d) { return d; });

    rows.exit().remove();

    return table;
}

//-------------------------------------------------------------------
// Converts a single run's data into a list
//-------------------------------------------------------------------
function listForRun(run, date){
	
	var timeFormat = d3.time.format.utc("%H:%M:%S");
	var dateFormat = d3.time.format("%Y-%m-%d");

	if(!date)
		var dateStr = dateFormat(run['date']);
	else
		var dateStr = dateFormat(date);

	var list = [dateStr, 
		run['distance'].toFixed(2), 
		timeFormat(new Date(run['duration']*1000)), 
		run['avgspeed'].toFixed(2), 
		run['maxspeed'].toFixed(2)];

	return list;
}


//-------------------------------------------------------------------
// Converts a single run's data into tabular form to be dropped into 
// a html table.
//-------------------------------------------------------------------
function varNamesForRun()
{
	return ["Date", "Distance (km)", "Duration", "Avg Speed (km/h)", "Max Speed (km/h)"];
}

function tableForRun(run, date)
{
	var names = varNamesForRun();
	var list = listForRun(run, date);
	var tab = [];
	for (i=0; i<names.length; ++i){
		tab.push([names[i], list[i]]);
	}

	return tab;
}
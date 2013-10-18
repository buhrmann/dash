var timeFormat = d3.time.format.utc("%H:%M:%S");
var dateFormat = d3.time.format("%Y-%m-%d");

var runMapper = new Object();
runMapper.label = {"label" : "", "mapper" : function(x) { return x;} };
runMapper.distance = {"label" : "Distance", "mapper" : function(x) { return x.toFixed(2);} };
runMapper.duration = {"label" : "Duration", "mapper" : function(x) { return timeFormat(new Date(x*1000));} };
runMapper.avgspeed = {"label" : "Avg Speed", "mapper" : function(x) { return x.toFixed(2);} };
runMapper.maxspeed = {"label" : "Max Speed", "mapper" : function(x) { return x.toFixed(2);} };
runMapper.date = {"label" : "Date", "mapper" : function(x) { return dateFormat(x);} };
runMapper.order = ["date", "distance", "duration", "avgspeed"];
runMapper.statsorder = ["label", "distance", "duration", "avgspeed", "maxspeed"];

//-------------------------------------------------------------------
// Converts a single object of (k,v) pairs into a list of 
// formatted values
//-------------------------------------------------------------------
function mapObjToList(obj, vars, mapper){
	return vars.map(function(k) { return mapper[k].mapper(obj[k]); });
}

//-------------------------------------------------------------------
// Converts list of objects into a list of formatted values
//-------------------------------------------------------------------
function toMatrix(data, mapper, vars){
	matrix = [];
	var n = data.length;
	for (var i=0; i<n; i++){
		matrix.push(mapObjToList(data[i], vars, mapper));
	}
	return matrix;
}

//-------------------------------------------------------------------
// Transpose of above: each variable becomes a row, with name in 
// first column
//-------------------------------------------------------------------
function toMatrixTranspose(data, mapper, vars){
	matrix = [];
	var numVars = vars.length;
	var numRows = data.length;

	for (var i=0; i<numVars; i++){
		var v = vars[i];
		row = new Array(numRows + 1);
		row[0] = mapper[v].label;
		for (var j=0; j<numRows; j++){			
			row[j+1] = mapper[v].mapper(data[j][v]);
		}
		matrix.push(row);
	}

	return matrix;
}

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
// Drop data (list of objects) into a html table identified by 
// parent id
//-------------------------------------------------------------------
function tabulate(data, mapper, vars, parent, transposed, hasLabels){
	
	if(transposed){
		var matrix = toMatrixTranspose(data, mapper, vars);
		if(hasLabels){
			var labels = matrix[0];
			labels[0] = "";
			matrix = matrix.splice(1, matrix.length);
		}
	}
	else{
		var matrix = toMatrix(data, mapper, vars);
		var labels = vars.map(function(x) { return mapper[x]["label"] } );
	}

	var table = d3.select(parent).select("table");

    // append the header row
    if(labels){
	    var thead = table.select("thead");
	    thead.select("tr").selectAll("th")
	        .data(labels)
	        .enter()
	        .append("th")
	        .text(function(d) { return d; });
    }

    // create a table row for each row object in the data
    var tbody = table.select("tbody");
    var rows = tbody.selectAll("tr")
        //.data(data);
        .data(matrix);

    rows.enter().append("tr");    
    rows.exit().remove();

	 // Update cell by binding data in each row for each column
    var cells = rows.selectAll("td")
        //.data(function(d) { return mapObjToList(d, vars, mapper); }) // Bind the ith row;
        .data(function(d) { return d; }) // Bind the ith row;
        .text(function(d) { return d; }); // Bind the ith row;

   	cells.enter()
        .append("td")
        .text(function(d) { return d; });


    return table;
}

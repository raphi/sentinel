var SERVER_HOST = 'http://0.0.0.0'
var SERVER_PORT = '8080'

var graph;
var seriesData = [];


// Establish websocket connection with main server
this.socket = io.connect(SERVER_HOST + ':' + SERVER_PORT);

// Ask to get the initial dataset. This avoid multiple inits because of socket reconnections.
this.socket.emit('get_init_data');

// Receive the initial dataset
this.socket.on('initial_data', function (data) {
	var palette = new Rickshaw.Color.Palette( { scheme: 'classic9' } );

	for (var server_name in data) {
		var server_events = data[server_name];
	
		seriesData.push({ color: palette.color(), data: server_events, name: server_name });
	}

	initGraph();
});

// Receive real-time new event, update the dataset and refresh the graph
this.socket.on('real_time_event', function(data) {
	seriesData[0].data.push(data);
	graph.update();
});

// Receive real-time stats, display them in the radial elements
this.socket.on('stats_avg_load', function(data) {
	setRadials(data);
});

// Receive real-time alerts about load average
this.socket.on('alert', function(data) {
	var message = data.averageLoad.toFixed(2) +', triggered at ' + new Date(data.date).toLocaleString();

	if (data.type == 'info') {
		message = 'High load recovery - load = ' + message;
	} else {
		message = 'High load generated an alert - load = ' + message;
	}
	
	var alertTemplate = $('.alert-template').clone().removeClass('alert-template').addClass('alert-' + data.type);

	alertTemplate.find('.message').text(message);
	$('.alerts').append(alertTemplate);
});


// Init the graph, binding to the DOM and creates the different elements to switch graph properties
function initGraph() {

	// instantiate our graph
	graph = new Rickshaw.Graph( {
		element: document.getElementById("chart"),
		width: 800,
		height: 275,
		renderer: 'area',
		stroke: true,
		preserve: true,
		unstack: true,
		series: seriesData
	} );

	graph.render();

	var preview = new Rickshaw.Graph.RangeSlider( {
		graph: graph,
		element: document.getElementById('preview'),
	} );

	var hoverDetail = new Rickshaw.Graph.HoverDetail( {
		graph: graph,
		xFormatter: function(x) {
			return new Date(x).toString();
		}
	} );

	var legend = new Rickshaw.Graph.Legend( {
		graph: graph,
		element: document.getElementById('legend')
	} );

	var shelving = new Rickshaw.Graph.Behavior.Series.Toggle( {
		graph: graph,
		legend: legend
	} );

	var order = new Rickshaw.Graph.Behavior.Series.Order( {
		graph: graph,
		legend: legend
	} );

	var highlighter = new Rickshaw.Graph.Behavior.Series.Highlight( {
		graph: graph,
		legend: legend
	} );

	var smoother = new Rickshaw.Graph.Smoother( {
		graph: graph,
		element: document.querySelector('#smoother')
	} );

	var ticksTreatment = 'glow';

	var xAxis = new Rickshaw.Graph.Axis.Time( {
		graph: graph,
		ticksTreatment: ticksTreatment,
		timeFixture: new Rickshaw.Fixtures.Time.Local()
	} );

	xAxis.render();

	var yAxis = new Rickshaw.Graph.Axis.Y( {
		graph: graph,
		tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
		ticksTreatment: ticksTreatment
	} );

	yAxis.render();

	var controls = new RenderControls( {
		element: document.querySelector('form'),
		graph: graph
	} );

	var previewXAxis = new Rickshaw.Graph.Axis.Time({
		graph: preview.previews[0],
		timeFixture: new Rickshaw.Fixtures.Time.Local(),
		ticksTreatment: ticksTreatment
	});

	previewXAxis.render();
}

function setRadials(serverLoad) {

	var rp1 = radialProgress(document.getElementById('radial_load_min'))
	.label("Minimum Load")
	.diameter(150)
	.value(serverLoad.min)
	.render();

	var rp2 = radialProgress(document.getElementById('radial_load_avg'))
	.label("Average Load")
	.diameter(150)
	.value(serverLoad.avg)
	.render();

	var rp3 = radialProgress(document.getElementById('radial_load_max'))
	.label("Maximum Load")
	.diameter(150)
	.value(serverLoad.max)
	.render();
}

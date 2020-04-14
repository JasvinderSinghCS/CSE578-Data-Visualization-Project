(function () {

	// var bookName    = ["Animal Farm","Harry Potter","New Moon","Brave New World","Pride and Prejudice","The Hobbit","The Hunger Games","Angels and Demons"]
	// var author        = ["George Orwell","J.K Rowling","Stephenie Mayer","Alduos Huxley","Janes Austen","J.R.R Tolkein","Suzzane Collins","Dan Brown"]
	// var coverImage= ["https://images.gr-assets.com/books/1424037542l/7613.jpg","https://images.gr-assets.com/books/1474169725l/15881.jpg","https://images.gr-assets.com/books/1361039440l/49041.jpg","https://images.gr-assets.com/books/1523061131l/5129.jpg","https://images.gr-assets.com/books/1320399351l/1885.jpg","https://images.gr-assets.com/books/1372847500l/5907.jpg","https://images.gr-assets.com/books/1447303603l/2767052.jpg","https://images.gr-assets.com/books/1176671419l/643301.jpg"]

	var images = {
		'Insurgent': "https://images.gr-assets.com/books/1325667729l/11735983.jpg"
		, "The Help": "https://images.gr-assets.com/books/1346100365l/4667024.jpg"
		, "The Girl With The Dragon Tattoo": "https://images.gr-assets.com/books/1327868566l/2429135.jpg"
		, "The Girl Who Played With Fire": "https://images.gr-assets.com/books/1351778881l/5060378.jpg"
		, "Game Of Thrones": "https://images.gr-assets.com/books/1436732693l/13496.jpg"
		, "The kite runner": "https://images.gr-assets.com/books/1484565687l/77203.jpg"
	}

	var asin = []
	$.ajax({
		type: "GET",
		dataType: "json",
		url: "http://127.0.0.1:5000/api/getbooks",
		success: function (result) {

			$.each(result, function (index, element) {
				asin.push(element.asin);

				switch (element.Title) {
					case 'Insurgent':
						cover = images['Insurgent'];
						break;
					case 'The Help':
						cover = images['The Help'];
						break;
					case 'The Girl With The Dragon Tattoo':
						cover = images['The Girl With The Dragon Tattoo'];
						break;
					case 'The Girl Who Played With Fire':
						cover = images['The Girl Who Played With Fire'];
						break;
					case 'Game Of Thrones':
						cover = images['Game Of Thrones'];
						break;
					case 'The kite runner':
						cover = images['The kite runner'];
						break;
					default:
						cover = "http://covers.openlibrary.org/b/isbn/" + element.asin + "-M.jpg?default=false";
						break;
				}

				var card_html = '<div class="col-lg-2 col-md-6 col-sm-6 portfolio-item">\
				<div class="card h-70">\
						<img class="cover" height="100%" width ="100%" src="'+ cover + '" >\
						<div class="card-body" style="padding: 0.8rem;">\
							<h6 class="card-title">\
								<p>'+ element.Title + '</p>\
							</h6>\
							<p class="card-text">'+ element.Author + '</p>\
							<div id="rating'+ element.asin + '"></div>\
						</div>\
					</div>\
				</div>';

				$('#rowwrapper').append(card_html);

				$("#rating" + element.asin).rateYo({
					starWidth: "20px",
					multiColor: {
						"startColor": "#FF0000", //RED
						"endColor": "#00FF00"    //GREEN
					},
					fullStar: true
				}).on("rateyo.set", function (e, data) {
					//console.log("Rating:"+this.id+data.rating)
				});

			});
		}

	});

	$('#rowwrapper').after('<div class="recommend hide"><a id="btnRec" href="#vis" class="button button-3d button-primary button-rounded" data-toggle="modal" data-target=".bd-example-modal-lg">Show my recommendations!</a></div>')

	$('.panel-heading i').click(function () {
		var panel_body = $(this).parent().next('.panel-body');
		panel_body.slideToggle().toggleClass('hide1');

		if (panel_body.hasClass('hide1'))
			$(this).removeClass('fa-chevron-up').addClass('fa-chevron-down');
		else
			$(this).removeClass('fa-chevron-down').addClass('fa-chevron-up');
	});

	// Show/hide recommendation button
	// For initial load. If the page is reloaded and is already scrolled to the books section, then show the button
	showRecommendBtn();
	// Check the scroll offset to show/hide the recommend button
	$(window).scroll(function () {
		showRecommendBtn();
	});

	function showRecommendBtn() {
		setTimeout(function () {
			if ($(window).scrollTop() >= 320 && $('.recommend').hasClass('hide') == true) {
				$('.recommend').toggleClass('hide');
			} else if ($(window).scrollTop() < 320 && $('.recommend').hasClass('hide') == false) {
				$('.recommend').addClass('hide');
			}
		}, 100);
	}

	$('#btnRec').click(function () {
		var req_array = []
		$.each(asin, function (index, res) {
			var $rateYo = $("#rating" + res).rateYo();
			var rating = $rateYo.rateYo("rating");
			var req = { "asin": res, "reviewerID": "REV001", "overall": rating }

			req_array.push(req);
		});

		$.ajax({
			type: "POST",
			contentType: 'application/json',
			dataType: "json",
			data: JSON.stringify(req_array),
			url: "http://127.0.0.1:5000/api/getrec"
		}).done(function (data) {
			//console.log(data);
			// Scroll to the Bubble Chart
			$("html, body").animate({
				scrollTop: $("#vis").offset().top - 80
			}, 500);
			create_bubble(data);
		});
	});


	function get_ratings(isbn, name) {
		$.ajax({
			type: "GET",
			contentType: 'application/json',
			dataType: "json",
			url: "http://127.0.0.1:5000/api/ratings/" + isbn
		}).done(function (data) {
			console.log(data);
			show_ratingsbar(data, name);
		});
	}

	function get_heatmap(isbn, name) {
		$.ajax({
			type: "GET",
			contentType: 'application/json',
			dataType: "json",
			url: "http://127.0.0.1:5000/api/heatmap/" + isbn
		}).done(function (data) {
			//console.log(data);
			show_heatmap(data, name);
		});
	}

	function show_heatmap(data, name) {
		var now = moment().endOf('day').toDate();
		var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();

		var chartData = d3.time.days(yearAgo, now).map(function (dateElement) {
			return {
				date: dateElement,
				//count: (dateElement.getDay() !== 0 && dateElement.getDay() !== 6) ? Math.floor(Math.random() * 60) : Math.floor(Math.random() * 10)
				count: Math.floor(Math.random() * dateElement.getMonth() * 50)
			};
		});

		$('#heatmap').html('')
		$('#heatmap').append('<h5>When do people read ' + name + '</h5>')
		var heatmap = calendarHeatmap()
			.data(chartData)
			.selector('#heatmap')
			.tooltipEnabled(true)
			.colorRange(['#f4f7f7', '#79a8a9'])
			.onClick(function (data) {
				//console.log('data', data);
			});
		heatmap();    // render the chart
	}

	function plotBarUpdated(title, data) {
		data = data.sort((a, b) => parseInt(b.value, 10) - parseInt(a.value, 10));
		const color = ['#6E63A9', '#8D78C2', '#A98DD4', '#C1A2E1' , '#D7B8EB'];
		Highcharts.chart('containerbar', {
			chart: {
				type: 'bar'
			},
			title: {
				text: title
			},
			subtitle: {
				text: ''
			},
			xAxis: {
				categories: data.map(e => e.name),
				title: {
					text: 'Rating'
				}
			},
			yAxis: {
				min: 0,
				opposite: true,
				title: {
					text: 'No. of ratings',
					align: 'middle'
				},
				labels: {
					overflow: 'justify'
				}
			},
			tooltip: {
				valueSuffix: ' ratings'
			},
			plotOptions: {
				bar: {
					dataLabels: {
						enabled: true
					}
				}
			},
			
			credits: {
				enabled: false
			},
			series: [{
				name: 'No. of users',
				data: data.map((e, i) => { return { y: parseInt(e.value), color: color[i]} }),
				showInLegend: false,
			}]
		});
	}

	function show_ratingsbar(data, bookName) {

		plotBarUpdated('<h4>How people rated ' + bookName + '</h4>', data);
		return;
		$('#ratingBar').html('')
		//sort bars based on value
		data = data.sort(function (a, b) {
			return d3.ascending(a.value, b.value);
		})

		$('#ratingBar').append('<h4>How people rate ' + bookName + '</h4>')

		//set up svg using margin conventions - we'll need plenty of room on the left for labels
		var margin = {
			top: 15,
			right: 80,
			bottom: 15,
			left: 30
		};

		var width = $("#ratingBar").width(),
			height = 300 - margin.top - margin.bottom;

		var svg = d3.select("#ratingBar").append("svg")
			.attr("width", width)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var x = d3.scale.linear()
			.range([0, width - margin.right])
			.domain([0, d3.max(data, function (d) {
				return d.value;
			})]);

		var y = d3.scale.ordinal()
			.rangeRoundBands([height, 0], .1)
			.domain(data.map(function (d) {
				return d.name;
			}));

		//make y axis to show bar names
		var yAxis = d3.svg.axis()
			.scale(y)
			//no tick marks
			.tickSize(5)
			.orient("left");

		var gy = svg.append("g")
			.attr("class", "y axis")
			.call(yAxis)

		var bars = svg.selectAll(".bar")
			.data(data)
			.enter()
			.append("g")

		//append rects
		bars.append("rect")
			.attr("class", "bar")
			.attr("y", function (d) {
				return y(d.name);
			})
			.attr("height", y.rangeBand())
			.attr("x", 0)
			.attr("width", function (d) {
				return x(d.value);
			});

		//add a value label to the right of each bar
		bars.append("text")
			.attr("class", "label")
			.style('font-weight', 'bold')
			.style('font-size', '16px')
			//y position of the label is halfway down the bar
			.attr("y", function (d) {
				return y(d.name) + y.rangeBand() / 2 + 4;
			})
			//x position is 3 pixels to the right of the bar
			.attr("x", function (d) {
				return x(d.value) + 3;
			})
			.text(function (d) {
				return d.value;
			});
	}

	function add_title(title, author) {
		$("#titletext").html("");
		$('#vis').after('<h3 id = "titletext">Details about: "' + title + '" by <em>' + author + '</em></h3>');
	}

	function create_bubble(books) {
		var width = $("#vis").width(),
			height = 800,
			padding = 1.5, // separation between same-color nodes
			clusterPadding = 25, // separation between different-color nodes
			maxRadius = 30;

		var n = 100, // total number of nodes
			m = 20; // number of distinct clusters

		var color = d3.scale.category10()
			.domain(d3.range(m));

		// The largest node for each cluster.
		var clusters = new Array(m);
		var nodes = [];


		var data = books;

		for (var i = 0; i < data.length; i++) {
			var obj = data[i];
			for (var key in obj) {

				//var rating = obj['rating']; // rating

				// radius
				var n = obj['Title']; // name
				var div = obj['Author']; // division
				var asin = obj['asin']
				var r = 2.9399712579 * n.length;
				d = {
					cluster: div,
					radius: r,
					name: n,
					division: div,
					asin: asin,
					//rating: rating
				};
				// d = {cluster: div, radius: r};
				// console.log(key+"="+obj[key]);
			}
			if (!clusters[i] || (r > clusters[i].radius)) clusters[i] = d;
			nodes.push(d);
			// console.log(d);
		}

		// Use the pack layout to initialize node positions.
		d3.layout.pack()
			.sort(null)
			.size([width, height])
			.children(function (d) {
				return d.values;
			})
			.value(function (d) {
				return d.radius * d.radius;
			})
			.nodes({
				values: d3.nest()
					.key(function (d) {
						return d.cluster;
					})
					.entries(nodes)
			});

		var force = d3.layout.force()
			.nodes(nodes)
			.size([width, height])
			.gravity(.09)
			.charge(0)
			.on("tick", tick)
			.start();


		$('#vis').html('')

		var svg = d3.select("#vis").append("svg")
			.attr("width", width)
			.attr("height", height);

		// console.log(nodes)

		var node = svg.selectAll("g")
			.data(nodes)
			.enter().append("g").call(force.drag);

		var circles = node.append("circle")
			.style("fill", function (d) {
				return color(d.cluster);
			})

		node.append("text")
			.attr("text-anchor", "middle")
			.text(function (d) {
				return d.name
			})
			.style("stroke", "black")
			// .style("font-size", function(d){
			// 	return (d.r / 8) + "px";
			// })
			.style("font-size", "12px");

		node.selectAll("circle")
			.on('dblclick', function (d, i) {
				//console.log(d.name);    
				add_title(d.name, d.division);
				get_heatmap(d.asin, d.name);
				get_ratings(d.asin, d.name);

				$("html, body").animate({
					scrollTop: $("#textDesc").offset().top - 80
				}, 500);
			})
			.transition()
			.duration(1500)
			.delay(function (d, i) {
				return i * 5;
			})
			.attrTween("r", function (d) {
				var i = d3.interpolate(0, d.radius);
				return function (t) {
					return d.radius = i(t);
				};
			});

		function tick(e) {
			node.each(cluster(10 * e.alpha * e.alpha))
				.each(collide(.5))
				.attr("transform", function (d) {
					var k = "translate(" + d.x + "," + d.y + ")";
					return k;
				})
		}

		// Move d to be adjacent to the cluster node.
		function cluster(alpha) {
			return function (d) {
				var cluster = clusters[d.index];
				if (cluster === d) return;
				var x = d.x - cluster.x,
					y = d.y - cluster.y,
					l = Math.sqrt(x * x + y * y),
					r = d.radius + cluster.radius;
				if (l != r) {
					l = (l - r) / l * alpha;
					d.x -= x *= l;
					d.y -= y *= l;
					cluster.x += x;
					cluster.y += y;
				}
			};
		}

		// Resolves collisions between d and all other circles.
		function collide(alpha) {
			var quadtree = d3.geom.quadtree(nodes);
			return function (d) {
				var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
					nx1 = d.x - r,
					nx2 = d.x + r,
					ny1 = d.y - r,
					ny2 = d.y + r;
				quadtree.visit(function (quad, x1, y1, x2, y2) {
					if (quad.point && (quad.point !== d)) {
						var x = d.x - quad.point.x,
							y = d.y - quad.point.y,
							l = Math.sqrt(x * x + y * y),
							r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? padding : clusterPadding);
						if (l < r) {
							l = (l - r) / l * alpha;
							d.x -= x *= l;
							d.y -= y *= l;
							quad.point.x += x;
							quad.point.y += y;
						}
					}
					return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
				});
			};
		}
	}

})();
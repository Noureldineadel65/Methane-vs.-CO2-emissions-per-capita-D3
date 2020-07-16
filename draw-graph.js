function formatter(row) {
	var invalidRows = [
		"Arab World",
		"Central Europe and the Baltics",
		"Caribbean small states",
		"East Asia & Pacific (excluding high income)",
		"Early-demographic dividend",
		"East Asia & Pacific",
		"Europe & Central Asia (excluding high income)",
		"Europe & Central Asia",
		"Euro area",
		"European Union",
		"Fragile and conflict affected situations",
		"High income",
		"Heavily indebted poor countries (HIPC)",
		"IBRD only",
		"IDA & IBRD total",
		"IDA total",
		"IDA blend",
		"IDA only",
		"Not classified",
		"Latin America & Caribbean (excluding high income)",
		"Latin America & Caribbean",
		"Least developed countries: UN classification",
		"Low income",
		"Lower middle income",
		"Low & middle income",
		"Late-demographic dividend",
		"Middle East & North Africa",
		"Middle income",
		"Middle East & North Africa (excluding high income)",
		"North America",
		"OECD members",
		"Other small states",
		"Pre-demographic dividend",
		"Pacific island small states",
		"Post-demographic dividend",
		"Sub-Saharan Africa (excluding high income)",
		"Sub-Saharan Africa",
		"Small states",
		"East Asia & Pacific (IDA & IBRD countries)",
		"Europe & Central Asia (IDA & IBRD countries)",
		"Latin America & the Caribbean (IDA & IBRD countries)",
		"Middle East & North Africa (IDA & IBRD countries)",
		"South Asia (IDA & IBRD)",
		"Sub-Saharan Africa (IDA & IBRD countries)",
		"Upper middle income",
		"World",
	];
	var obj = {
		region: row["Country Name"],
		indicator: row["Indicator Name"],
	};
	if (invalidRows.indexOf(obj.region) > -1) return;
	for (var key in row) {
		if (parseInt(key)) obj[key] = +row[key] || null;
	}
	return obj;
}
const toolTip = d3.select("#tooltip");
function formatAllData(data) {
	var yearObj = {};

	data.forEach(function (arr) {
		// get the indicator and format the key
		var indicator = arr[0].indicator
			.split(" ")[0]
			.replace(",", "")
			.toLowerCase();

		arr.forEach(function (obj) {
			// get current region
			var region = obj.region;

			// parse through every year, add that region's data to that year array
			for (var year in obj) {
				if (parseInt(year)) {
					if (!yearObj[year]) yearObj[year] = [];
					var yearArr = yearObj[year];
					var regionObj = yearArr.find((el) => el.region === region);
					if (regionObj) regionObj[indicator] = obj[year];
					else {
						var newObj = { region: region };
						newObj[indicator] = obj[year];
						yearArr.push(newObj);
					}
				}
			}
		});
	});
	// remove years that don't have complete data sets for any region
	for (var year in yearObj) {
		yearObj[year] = yearObj[year].filter(validRegion);
		if (yearObj[year].length === 0) delete yearObj[year];
	}
	return yearObj;
}

function validRegion(d) {
	for (var key in d) {
		if (d[key] === null) return false;
	}
	return true;
}

var files = [
	"./data/co2/API_EN.ATM.CO2E.KT_DS2_en_csv_v2.csv",
	"./data/methane/API_EN.ATM.METH.KT.CE_DS2_en_csv_v2.csv",
	"./data/renewable/API_EG.FEC.RNEW.ZS_DS2_en_csv_v2.csv",
	"./data/population/API_SP.POP.TOTL_DS2_en_csv_v2.csv",
	"./data/urban_population/API_SP.URB.TOTL_DS2_en_csv_v2.csv",
];
const dimensions = {
	width: window.innerWidth * 0.6,
	height: window.innerHeight * 0.6,
	margin: {
		top: 50,
		left: 120,
		bottom: 120,
		right: 50,
	},
	getBoundedWidth: function () {
		return this.width - this.margin.left - this.margin.right;
	},
	getBoundedHeight: function () {
		return this.height - this.margin.top - this.margin.bottom;
	},
};
const wrapper = d3
	.select("#wrapper")
	.append("svg")
	.attr("width", dimensions.width)
	.attr("height", dimensions.height);
const bounds = wrapper
	.append("g")
	.classed("bounds", true)
	.attr(
		"transform",
		`translate(${dimensions.margin.left}, ${dimensions.margin.top})`
	);
Promise.all(files.map((url) => d3.csv(url, formatter))).then(function (values) {
	const data = formatAllData(values);
	const minYear = d3.min(Object.keys(data));
	const maxYear = d3.max(Object.keys(data));

	// Accessors
	const accessors = {
		co2: (d) => d.co2,
		methane: (d) => d.methane,
		population: (d) => d.population,
		renewable: (d) => d.renewable,
		urban: (d) => d.urban,
	};

	// Creating Labels
	wrapper
		.append("text")
		.classed("co2EmissionLabel", true)
		.text("CO2 Emissions (kt per person)")
		.attr("x", dimensions.width / 2)
		.attr("y", dimensions.height - 20)
		.style("text-anchor", "middle")
		.attr("fill", "#ffffff");
	wrapper
		.append("text")
		.classed("methaneEmissionLabel", true)
		.text("Methane Emissions (kt of CO2 equivalent per person)")
		.attr("transform", "rotate(90)")
		.style("text-anchor", "middle")
		.attr("x", dimensions.height / 2)
		.attr("y", -30)
		.attr("fill", "#ffffff");
	const xAxis = bounds
		.append("g")
		.classed("x-axis", true)
		.attr(
			"transform",
			`translate(0, ${dimensions.getBoundedHeight() + 30})`
		);
	const yAxis = bounds
		.append("g")
		.classed("y-axis", true)
		.attr("transform", `translate(-25 ,0)`);
	drawGraph(minYear);
	function drawGraph(year) {
		const yearData = data[year];
		d3.select("#year").text(year);
		// Create Scales
		const xScale = d3
			.scaleLinear()
			.domain(
				d3.extent(
					yearData,
					(d) => accessors.co2(d) / accessors.population(d)
				)
			)
			.range([0, dimensions.getBoundedWidth()])
			.nice();
		const yScale = d3
			.scaleLinear()
			.domain(
				d3.extent(
					yearData,
					(d) => accessors.methane(d) / accessors.population(d)
				)
			)
			.range([dimensions.getBoundedHeight(), 0])
			.nice();
		const colorScale = d3
			.scaleLinear()
			.domain(d3.extent(yearData, accessors.renewable))
			.range(["#bbe1fa", "#0f4c75"]);
		const rScale = d3
			.scaleLinear()
			.domain(d3.extent(yearData, accessors.urban))
			.range([15, 35]);

		// Creating Axis
		xAxisGenerator = d3.axisBottom(xScale);
		yAxisGenerator = d3.axisLeft(yScale);

		xAxis
			.call(xAxisGenerator)
			.selectAll("text")
			.attr("y", -3)
			.attr("x", 10)
			.attr("transform", "rotate(90)")
			.style("text-anchor", "start")
			.style("font-weight", "bolder")
			.style("font-size", ".7rem");

		yAxis
			.call(yAxisGenerator)
			.selectAll("text")
			.style("font-size", ".7rem");
		// Creating Circles
		const update = bounds.selectAll("circle").data(yearData);
		update.exit().transition().duration(1000).attr("r", 0).remove();
		update
			.enter()
			.append("circle")
			.attr("cx", (d) =>
				xScale(accessors.co2(d) / accessors.population(d))
			)
			.attr("cy", (d) =>
				yScale(accessors.methane(d) / accessors.population(d))
			)
			.on("mousemove", onMouseMove)
			.on("mouseleave", onMouseLeave)
			.merge(update)
			.on("mousemove", onMouseMove)
			.on("mouseleave", onMouseLeave)
			.transition()
			.duration(1000)
			.delay((d, i) => i * 5)
			.attr("cx", (d) =>
				xScale(accessors.co2(d) / accessors.population(d))
			)
			.attr("cy", (d) =>
				yScale(accessors.methane(d) / accessors.population(d))
			)
			.attr("r", (d) => rScale(accessors.urban(d)))
			.attr("fill", (d) => colorScale(accessors.renewable(d)));
		function showToolTip(d) {
			const { co2, methane, region, urban, renewable } = d;
			toolTip.style("opacity", 1);

			toolTip.style(
				"left",
				d3.event.x - toolTip.node().offsetWidth / 2 + "px"
			);
			toolTip.style("top", d3.event.y - 160 + "px");

			toolTip.html(`
                <p>Region: ${region}</p>
                <p>Methane per capita: ${methane}</p>
                <p>CO2 per capita: ${co2}</p>
                <p>Renewable energy: ${renewable}</p>
                <p>Urban population: ${urban}</p>
                `);
		}
		function hideToolTip() {
			toolTip.style("opacity", 0);
		}
		function onMouseMove(d) {
			showToolTip(d);
			const dayDot = bounds
				.append("circle")

				.attr("class", "tooltipDot")
				.attr("cx", xScale(accessors.co2(d) / accessors.population(d)))
				.attr(
					"cy",
					yScale(accessors.methane(d) / accessors.population(d))
				)
				.style("fill", colorScale(accessors.renewable(d)))
				.style("pointer-events", "none")
				.transition()
				.duration(500)
				.attr("r", rScale(accessors.urban(d)) + 5);
		}
		function onMouseLeave(d) {
			hideToolTip();
			d3.selectAll(".tooltipDot")
				.transition()
				.duration(500)
				.attr("r", 0)
				.remove();
		}
	}
	d3.select("input")
		.property("min", minYear)
		.property("max", maxYear)
		.property("value", minYear)
		.on("input", () => drawGraph(+d3.event.target.value));
});

class BarChart {
	constructor(parentElement, data) {
		this.parentElement = parentElement;
		this.data = data;
		this.initVis();
	}

	processData(data) {
		const groupedData = d3.group(data, (d) => d.product);

		const processedData = [];

		groupedData.forEach((values, product) => {
			const data2020 = values.find((d) => d.date.getFullYear() === 2020);
			const latestData = values[values.length - 1];

			if (data2020 && latestData) {
				const priceChange =
					((latestData.price - data2020.price) / data2020.price) * 100;
				processedData.push({
					product: product,
					priceChange: priceChange,
				});
			}
		});

		return processedData;
	}

	initVis() {
		let vis = this;

		vis.margin = { top: 50, right: 30, bottom: 150, left: 60 };
		vis.width =
			document.getElementById(vis.parentElement).clientWidth -
			vis.margin.left -
			vis.margin.right;
		vis.height =
			document.getElementById(vis.parentElement).clientHeight -
			vis.margin.top -
			vis.margin.bottom;

		vis.svg = d3
			.select(`#${vis.parentElement}`)
			.append("svg")
			.attr("width", vis.width + vis.margin.left + vis.margin.right)
			.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
			.append("g")
			.attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

		vis.svg
			.append("text")
			.attr("x", vis.width / 2)
			.attr("y", -20)
			.attr("text-anchor", "middle")
			.style("font-size", "18px")
			.style("font-weight", "bold")
			.text("Price Change Since 2020 to 2024 (%)");

		vis.x = d3.scaleBand().range([0, vis.width]).padding(0.2);
		vis.y = d3.scaleLinear().range([vis.height, 0]);

		vis.xAxis = vis.svg
			.append("g")
			.attr("transform", `translate(0,${vis.height})`);
		
		vis.yAxis = vis.svg.append("g");


		vis.processedData = this.processData(this.data);
		vis.tooltip = d3.select("body").append("div")
		.attr("class", "tooltip")
		.style("position", "absolute")
		.style("background-color", "lightsteelblue")
		.style("padding", "5px")
		.style("border-radius", "5px")
		.style("visibility", "hidden")
		.style("top", "0px") 
		.style("left", "0px")  
		.style("z-index", "1000"); 

		vis.updateVis();
	}

	updateVis() {
		let vis = this;

		vis.x.domain(vis.processedData.map((d) => d.product));
		vis.y.domain([
			d3.min(vis.processedData, (d) => d.priceChange),
			d3.max(vis.processedData, (d) => d.priceChange),
		]);

		vis.xAxis
			.call(d3.axisBottom(vis.x))
			.selectAll("text")
			.attr("transform", "rotate(-45)")
			.style("text-anchor", "end");
		vis.yAxis.call(d3.axisLeft(vis.y).tickFormat((d) => d + "%"));
		vis.yAxis   .selectAll("text")
		.style("font-size", "14px") 
		.style("font-family", "Arial"); 
		vis.svg.selectAll(".bar").remove();

		vis.svg
			.selectAll(".bar")
			.data(vis.processedData)
			.enter()
			.append("rect")
			.attr("class", "bar")
			.attr("x", (d) => vis.x(d.product))
			.attr("y", (d) => (d.priceChange >= 0 ? vis.y(d.priceChange) : vis.y(0)))
			.attr("height", (d) => Math.abs(vis.y(d.priceChange) - vis.y(0)))
			.attr("width", vis.x.bandwidth())
			.attr("fill", (d) => (d.priceChange >= 0 ? "steelblue" : "red"))            
			.on("mouseover", function(event, d) {
                console.log(`Tooltip HTML: Price Increase: ${d.priceChange}%<br>Grocery Name: ${d.product}`);

                d3.select(this)
                    .attr("stroke-width", "2px")
                    .attr("stroke", "black")
                    .attr("fill", "rgba(173,222,255,0.62)");
        
                vis.tooltip
                    .style("opacity", 1)
                    .style("left", event.pageX + 20 + "px")
                    .style("top", event.pageY + "px")
                    .style("visibility", "visible")
					.html(`
					<div style="border: thin solid grey; border-radius: 5px; background: lightgrey; padding: 10px; font-size: 16px;">
						<h4 style="font-size: 18px;">Grocery Name: ${d.product}</h4>
						<h4 style="font-size: 18px;">Price Increase: ${d.priceChange.toFixed(2)}%</h4>
					</div>
						`);
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .attr("stroke-width", "0px")
					.attr("fill", (d) => (d.priceChange >= 0 ? "steelblue" : "red"))           
        
                tooltip
                    .style("opacity", 0)
                    .style("left", "0px")
                    .style("top", "0px")
                    .html(""); // Clear tooltip content;
            });
	}
}

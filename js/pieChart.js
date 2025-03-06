/* * * * * * * * * * * * * *
*         PieChart         *
* * * * * * * * * * * * * */

class PieChart {
    constructor(parentElement) {
        this.parentElement = parentElement;
        this.circleColors = ['#b2182b', '#d6604d', '#f4a582', '#fddbc7'];

        // call initVis method
        this.initVis();
    }

    initVis() {
        let vis = this;

        // margin conventions
        vis.margin = { top: 10, right: 20, bottom: 10, left: 20 };
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;
        vis.radius = Math.min(vis.width, vis.height) / 2;

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.width / 2}, ${vis.height / 2})`);

        // add title
        vis.svg.append('g')
            .attr('class', 'title pie-title')
            .append('text')
            .text('Pie Chart')
            .attr('transform', `translate(0, -${vis.radius + 20})`)
            .attr('text-anchor', 'middle');

        // Define pie layout
        vis.pie = d3.pie().value(d => d.value);

        // Define arc generator
        vis.arc = d3.arc()
            .innerRadius(0)
            .outerRadius(vis.radius);

        // Append tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .attr("id", "pieTooltip")
            .style("opacity", 0);

        // call next method in pipeline
        this.wrangleData();
    }

    // wrangleData method
    wrangleData() {
        let vis = this;

        vis.displayData = [];

        // generate random data
        for (let i = 0; i < 4; i++) {
            let random = Math.floor(Math.random() * 100);
            vis.displayData.push({
                value: random,
                color: vis.circleColors[i]
            });
        }

        vis.updateVis();
    }

    // updateVis method
    updateVis() {
        let vis = this;

        // Bind data to slices
        let slices = vis.svg.selectAll(".arc")
            .data(vis.pie(vis.displayData));

        // Enter new elements
        let newSlices = slices.enter().append("path")
            .attr("class", "arc")
            .attr("fill", d => d.data.color)
            .attr("d", vis.arc)
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .attr("stroke-width", "2px")
                    .attr("stroke", "black")
                    .attr("fill", "rgba(173,222,255,0.62)");

                vis.tooltip
                    .style("opacity", 1)
                    .style("left", event.pageX + 20 + "px")
                    .style("top", event.pageY + "px")
                    .html(`
                        <div style="border: thin solid grey; border-radius: 5px; background: lightgrey; padding: 10px">
                            <h3>Arc Index: ${d.index}</h3>
                            <h4>Value: ${d.data.value}</h4>
                            <h4>Start Angle: ${d.startAngle.toFixed(2)}</h4>
                            <h4>End Angle: ${d.endAngle.toFixed(2)}</h4>
                        </div>
                    `);
            })
            .on("mouseout", function (event, d) {
                d3.select(this)
                    .attr("stroke-width", "0px")
                    .attr("fill", d.data.color);

                vis.tooltip
                    .style("opacity", 0)
                    .style("left", "0px")
                    .style("top", "0px")
                    .html("");
            });

        // Merge and update existing elements
        slices.merge(newSlices)
            .transition()
            .duration(1000)
            .attr("d", vis.arc);

        // Remove excess elements
        slices.exit().remove();
    }
}

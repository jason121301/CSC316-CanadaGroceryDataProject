class DotChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Margin and SVG setup
        vis.margin = { top: 20, right: 30, bottom: 50, left: 50 };
        vis.width = 800 - vis.margin.left - vis.margin.right;
        vis.height = 500 - vis.margin.top - vis.margin.bottom;

        vis.svg = d3.select(`#${vis.parentElement}`).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Scales
        vis.x = d3.scaleTime()
            .domain(d3.extent(vis.data, d => d.date))
            .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .domain([0, d3.max(vis.data, d => d.price)])
            .range([vis.height, 0]);

        // Axes
        vis.xAxis = vis.svg.append("g")
            .attr("transform", `translate(0,${vis.height})`)
            .call(d3.axisBottom(vis.x));

        vis.yAxis = vis.svg.append("g")
            .call(d3.axisLeft(vis.y));

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        vis.dots = vis.svg.selectAll(".dot")
            .data(vis.data)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => vis.x(d.date))
            .attr("cy", d => vis.y(d.price))
            .attr("r", 4)
            .style("fill", "steelblue")
    }
}

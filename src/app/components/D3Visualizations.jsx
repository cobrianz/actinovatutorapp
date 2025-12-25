"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// Enhanced Visualization Container with better styling
const VisualizationContainer = ({ title, children, description }) => (
  <div className="group relative w-full bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-gray-900/90 dark:to-gray-800/90 backdrop-blur-xl rounded-3xl p-8 border border-white/60 dark:border-gray-700/60 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-1">
    {/* Animated background gradient */}
    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

    {/* Glow effect */}
    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" />

    <div className="relative">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
          <span className="text-white text-lg">
            {title.includes("Tree")
              ? "📊"
              : title.includes("Radial")
                ? "🌐"
                : title.includes("Treemap")
                  ? "📦"
                  : "☀️"}
          </span>
        </div>
        <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
          {title}
        </h3>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-br from-gray-50/60 to-white/60 dark:from-gray-900/40 dark:to-gray-800/40 backdrop-blur-sm">
        {children}
      </div>

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);

export function TidyTree({ data = null }) {
  const svgRef = useRef();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    setIsLoading(true);
    const container = d3.select(svgRef.current);
    const { width, height } = svgRef.current.getBoundingClientRect();

    container.selectAll("*").remove();

    const svg = container
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const hierarchy = d3.hierarchy(data);
    const treeLayout = d3.tree().size([width - 120, height - 120]);
    const tree = treeLayout(hierarchy);

    const g = svg.append("g").attr("transform", "translate(60,60)");

    // Enhanced color scale
    const colorScale = d3
      .scaleOrdinal()
      .domain(data.children?.map((d) => d.name) || [])
      .range([
        "#8b5cf6",
        "#06b6d4",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#6366f1",
        "#ec4899",
        "#84cc16",
      ]);

    // Enhanced links with gradient
    const links = g
      .selectAll(".link")
      .data(tree.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr(
        "d",
        d3
          .linkHorizontal()
          .x((d) => d.y)
          .y((d) => d.x)
      )
      .attr("fill", "none")
      .attr("stroke", "url(#linkGradient)")
      .attr("stroke-width", 2.5)
      .attr("stroke-linecap", "round")
      .attr("opacity", 0)
      .transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .attr("opacity", 0.8);

    // Add gradient for links
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "linkGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#8b5cf6")
      .attr("stop-opacity", 0.6);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#06b6d4")
      .attr("stop-opacity", 0.6);

    // Enhanced nodes
    const nodes = g
      .selectAll(".node")
      .data(tree.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(300)
          .attr("transform", `translate(${d.y},${d.x}) scale(1.4)`);

        d3.select(this)
          .select("circle")
          .transition()
          .duration(300)
          .attr("stroke-width", 4)
          .attr("filter", "url(#glow)");
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .transition()
          .duration(300)
          .attr("transform", `translate(${d.y},${d.x}) scale(1)`);

        d3.select(this)
          .select("circle")
          .transition()
          .duration(300)
          .attr("stroke-width", 3)
          .attr("filter", "none");
      });

    // Add glow filter
    const glowFilter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("height", "300%")
      .attr("width", "300%")
      .attr("x", "-75%")
      .attr("y", "-75%");

    glowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "3.5")
      .attr("result", "coloredBlur");

    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    nodes
      .append("circle")
      .attr("r", (d) => (d.children ? 12 : 8))
      .attr("fill", (d) => colorScale(d.data.name))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 3)
      .attr("class", "node-circle")
      .attr("opacity", 0)
      .transition()
      .duration(600)
      .delay((d, i) => i * 150)
      .attr("opacity", 1);

    // Enhanced labels
    nodes
      .append("text")
      .attr("dy", (d) => (d.children ? -20 : 18))
      .attr("text-anchor", "middle")
      .attr("font-size", "13px")
      .attr("font-weight", (d) => (d.children ? "bold" : "600"))
      .attr("fill", (d) => (d.children ? "#1f2937" : "#4b5563"))
      .attr("class", "font-sans")
      .text((d) => d.data.name)
      .style("pointer-events", "none")
      .attr("opacity", 0)
      .transition()
      .duration(600)
      .delay((d, i) => i * 150 + 200)
      .attr("opacity", 1);

    setIsLoading(false);
  }, [data]);

  return (
    <VisualizationContainer
      title="Tidy Tree Layout"
      description="Hierarchical tree structure with smooth animations, color-coded nodes, and interactive hover effects"
    >
      <div className="w-full h-[400px] relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50/80 to-white/80 dark:from-gray-900/80 dark:to-gray-800/80 backdrop-blur-sm rounded-2xl">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Rendering tree...
              </p>
            </div>
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </VisualizationContainer>
  );
}

export function RadialDendrogram({ data = null }) {
  const svgRef = useRef();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    setIsLoading(true);
    const container = d3.select(svgRef.current);
    const { width, height } = svgRef.current.getBoundingClientRect();
    const radius = Math.min(width, height) / 2 - 80;

    container.selectAll("*").remove();

    const svg = container
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const hierarchy = d3.hierarchy(data);
    const tree = d3.cluster().size([2 * Math.PI, radius]);
    const root = tree(hierarchy);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Enhanced color scale
    const colorScale = d3
      .scaleOrdinal()
      .range([
        "#8b5cf6",
        "#06b6d4",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#ec4899",
        "#84cc16",
      ]);

    // Enhanced links
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr(
        "d",
        d3
          .linkRadial()
          .angle((d) => d.x)
          .radius((d) => d.y)
      )
      .attr("fill", "none")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 2.5)
      .attr("stroke-linecap", "round")
      .attr("opacity", 0)
      .transition()
      .duration(800)
      .delay((d, i) => i * 80)
      .attr("opacity", 0.8);

    // Enhanced nodes with animation
    const nodes = g
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("cx", (d) => d.y * Math.cos(d.x - Math.PI / 2))
      .attr("cy", (d) => d.y * Math.sin(d.x - Math.PI / 2))
      .attr("r", 0)
      .attr("fill", (d) => colorScale(d.data.name))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 3)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(300)
          .attr("r", d.children ? 14 : 10);
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .transition()
          .duration(300)
          .attr("r", d.children ? 10 : 7);
      })
      .transition()
      .duration(600)
      .delay((d, i) => i * 120)
      .attr("r", (d) => (d.children ? 10 : 7));

    // Enhanced labels
    g.selectAll(".label")
      .data(root.descendants())
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d) => d.y * Math.cos(d.x - Math.PI / 2))
      .attr("y", (d) => d.y * Math.sin(d.x - Math.PI / 2))
      .attr("dy", "0.32em")
      .attr("text-anchor", (d) => (d.x < Math.PI ? "start" : "end"))
      .attr("font-size", "12px")
      .attr("font-weight", (d) => (d.children ? "bold" : "600"))
      .attr("fill", "#374151")
      .attr("class", "font-sans")
      .text((d) => d.data.name)
      .style("pointer-events", "none")
      .attr("opacity", 0)
      .transition()
      .duration(600)
      .delay((d, i) => i * 120 + 200)
      .attr("opacity", 1);

    setIsLoading(false);
  }, [data]);

  return (
    <VisualizationContainer
      title="Radial Dendrogram"
      description="Circular representation of hierarchical data with radial layout and smooth node interactions"
    >
      <div className="w-full h-[400px] flex items-center justify-center relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50/80 to-white/80 dark:from-gray-900/80 dark:to-gray-800/80 backdrop-blur-sm rounded-2xl z-10">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Building radial layout...
              </p>
            </div>
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full max-w-[500px]" />
      </div>
    </VisualizationContainer>
  );
}

export function RadialTidyTree({ data = null }) {
  const svgRef = useRef();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    setIsLoading(true);
    const container = d3.select(svgRef.current);
    const { width, height } = svgRef.current.getBoundingClientRect();
    const radius = Math.min(width, height) / 2 - 100;

    container.selectAll("*").remove();

    const svg = container
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const hierarchy = d3.hierarchy(data);
    const tree = d3.tree().size([2 * Math.PI, radius]);
    const root = tree(hierarchy);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Enhanced color scale
    const colorScale = d3
      .scaleOrdinal()
      .range([
        "#ef4444",
        "#f59e0b",
        "#10b981",
        "#06b6d4",
        "#8b5cf6",
        "#ec4899",
      ]);

    // Enhanced links
    const links = g
      .selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr(
        "d",
        d3
          .linkRadial()
          .angle((d) => d.x)
          .radius((d) => d.y)
      )
      .attr("fill", "none")
      .attr("stroke", "#d1d5db")
      .attr("stroke-width", 2.5)
      .attr("stroke-linecap", "round")
      .attr("opacity", 0)
      .transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .attr("opacity", 0.8);

    // Enhanced nodes
    const node = g
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr(
        "transform",
        (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y})`
      )
      .style("cursor", "pointer");

    node
      .append("circle")
      .attr("r", 0)
      .attr("fill", (d) => colorScale(d.data.name))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 3)
      .on("mouseover", function () {
        d3.select(this.parentNode)
          .transition()
          .duration(300)
          .attr(
            "transform",
            d3.select(this.parentNode).__data__
              ? `rotate(${(d3.select(this.parentNode).__data__.x * 180) / Math.PI - 90}) translate(${d3.select(this.parentNode).__data__.y}) scale(1.3)`
              : this.parentNode.getAttribute("transform")
          );
      })
      .on("mouseout", function () {
        d3.select(this.parentNode)
          .transition()
          .duration(300)
          .attr(
            "transform",
            d3.select(this.parentNode).__data__
              ? `rotate(${(d3.select(this.parentNode).__data__.x * 180) / Math.PI - 90}) translate(${d3.select(this.parentNode).__data__.y})`
              : this.parentNode.getAttribute("transform")
          );
      })
      .transition()
      .duration(600)
      .delay((d, i) => i * 150)
      .attr("r", (d) => (d.children ? 10 : 6));

    // Enhanced labels
    node
      .append("text")
      .attr("dy", "0.31em")
      .attr("transform", (d) => `rotate(${d.x >= Math.PI ? 180 : 0})`)
      .attr("text-anchor", (d) => (d.x < Math.PI ? "start" : "end"))
      .attr("font-size", "12px")
      .attr("font-weight", (d) => (d.children ? "bold" : "600"))
      .attr("fill", "#1f2937")
      .attr("class", "font-sans")
      .text((d) => d.data.name)
      .style("pointer-events", "none")
      .attr("opacity", 0)
      .transition()
      .duration(600)
      .delay((d, i) => i * 150 + 200)
      .attr("opacity", 1);

    setIsLoading(false);
  }, [data]);

  return (
    <VisualizationContainer
      title="Radial Tidy Tree"
      description="Compact radial tree with enhanced node interactions, smooth curves, and progressive animations"
    >
      <div className="w-full h-[400px] flex items-center justify-center relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50/80 to-white/80 dark:from-gray-900/80 dark:to-gray-800/80 backdrop-blur-sm rounded-2xl z-10">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Creating radial tree...
              </p>
            </div>
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full max-w-[500px]" />
      </div>
    </VisualizationContainer>
  );
}

export function TreemapVisualization({ data = null }) {
  const svgRef = useRef();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    setIsLoading(true);
    const container = d3.select(svgRef.current);
    const { width, height } = svgRef.current.getBoundingClientRect();

    container.selectAll("*").remove();

    const svg = container
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const hierarchy = d3
      .hierarchy(data)
      .sum((d) => d.value || 1)
      .sort((a, b) => b.value - a.value);

    const treemap = d3
      .treemap()
      .size([width, height])
      .paddingInner(8)
      .paddingOuter(6)
      .paddingTop(28)
      .paddingRight(8)
      .paddingBottom(8)
      .paddingLeft(8);

    treemap(hierarchy);

    // Enhanced color scale
    const colorScale = d3
      .scaleSequential(d3.interpolatePlasma)
      .domain([0, hierarchy.leaves().length - 1]);

    const nodes = svg
      .selectAll(".node")
      .data(hierarchy.leaves())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .style("cursor", "pointer");

    // Enhanced rectangles with gradient
    nodes
      .append("rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", (d, i) => colorScale(i))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .attr("rx", 8)
      .attr("opacity", 0)
      .on("mouseover", function (event, d) {
        d3.select(this.parentNode)
          .transition()
          .duration(300)
          .attr("transform", `translate(${d.x0},${d.y0}) scale(1.02)`);

        d3.select(this).transition().duration(300).attr("stroke-width", 3);
      })
      .on("mouseout", function (event, d) {
        d3.select(this.parentNode)
          .transition()
          .duration(300)
          .attr("transform", `translate(${d.x0},${d.y0})`);

        d3.select(this).transition().duration(300).attr("stroke-width", 2);
      })
      .transition()
      .duration(600)
      .delay((d, i) => i * 50)
      .attr("opacity", 1);

    // Enhanced labels
    nodes
      .append("text")
      .attr("x", 10)
      .attr("y", 22)
      .attr("font-size", "13px")
      .attr("font-weight", "bold")
      .attr("fill", "#ffffff")
      .attr("text-anchor", "start")
      .attr("class", "font-sans")
      .text((d) => d.data.name)
      .attr("opacity", 0)
      .transition()
      .duration(400)
      .delay((d, i) => i * 50 + 200)
      .attr("opacity", 1);

    nodes
      .append("text")
      .attr("x", 10)
      .attr("y", 42)
      .attr("font-size", "11px")
      .attr("fill", "#ffffff")
      .attr("opacity", 0.9)
      .attr("class", "font-sans")
      .text((d) => `${d.data.value} units`)
      .attr("opacity", 0)
      .transition()
      .duration(400)
      .delay((d, i) => i * 50 + 300)
      .attr("opacity", 0.9);

    setIsLoading(false);
  }, [data]);

  return (
    <VisualizationContainer
      title="Treemap Layout"
      description="Space-optimized visualization showing data proportions with interactive rectangles and smooth transitions"
    >
      <div className="w-full h-[400px] relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50/80 to-white/80 dark:from-gray-900/80 dark:to-gray-800/80 backdrop-blur-sm rounded-2xl z-10">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Generating treemap...
              </p>
            </div>
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </VisualizationContainer>
  );
}

export function SunburstVisualization({ data = null }) {
  const svgRef = useRef();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    setIsLoading(true);
    const container = d3.select(svgRef.current);
    const { width, height } = svgRef.current.getBoundingClientRect();
    const radius = Math.min(width, height) / 2 - 80;

    container.selectAll("*").remove();

    const svg = container
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const hierarchy = d3.hierarchy(data).sum((d) => d.value || 1);

    const partition = d3.partition().size([2 * Math.PI, radius]);

    const root = partition(hierarchy).descendants();

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Enhanced color scale
    const colorScale = d3
      .scaleOrdinal()
      .range([
        "#8b5cf6",
        "#06b6d4",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#ec4899",
        "#84cc16",
      ]);

    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle(0.02)
      .padRadius(radius * 0.9)
      .innerRadius((d) => d.y0 * 0.7)
      .outerRadius((d) => d.y1);

    // Enhanced arcs with animation
    const arcs = g
      .selectAll("path")
      .data(root.filter((d) => d.depth > 0))
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) =>
        colorScale(d.parent ? d.parent.data.name : d.data.name)
      )
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2.5)
      .attr("opacity", 0)
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(300)
          .attr("transform", "scale(1.05)")
          .attr("stroke-width", 4);
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(300)
          .attr("transform", "scale(1)")
          .attr("stroke-width", 2.5);
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .attr("opacity", 1);

    // Enhanced labels
    g.selectAll(".label")
      .data(root.filter((d) => d.depth > 0 && d.y1 - d.y0 > 25))
      .enter()
      .append("text")
      .attr("transform", (d) => {
        const x = (d.x0 + d.x1) / 2;
        const y = (d.y0 + d.y1) / 2;
        const rot = (x * 180) / Math.PI - 90;
        return `rotate(${rot}) translate(${y},0) rotate(${x > Math.PI ? 180 : 0})`;
      })
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "#ffffff")
      .attr("class", "font-sans")
      .text((d) => d.data.name)
      .attr("opacity", 0)
      .transition()
      .duration(600)
      .delay((d, i) => i * 100 + 400)
      .attr("opacity", 1);

    setIsLoading(false);
  }, [data]);

  return (
    <VisualizationContainer
      title="Sunburst Diagram"
      description="Concentric circles representing hierarchical data with smooth transitions and interactive segments"
    >
      <div className="w-full h-[400px] flex items-center justify-center relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50/80 to-white/80 dark:from-gray-900/80 dark:to-gray-800/80 backdrop-blur-sm rounded-2xl z-10">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Building sunburst...
              </p>
            </div>
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full max-w-[500px]" />
      </div>
    </VisualizationContainer>
  );
}

export function ScrollableDendrograms({ data = null, hoveredNode, onNodeHover }) {
  const radialRef = useRef(null);
  const verticalRef = useRef(null);
  const horizontalRef = useRef(null);
  const sunburstRef = useRef(null);
  const tooltipRef = useRef(null);

  const vizData = data || {
    name: "Human Body",
    children: [
      {
        name: "Skeletal System",
        color: "#f59e0b",
        children: [
          {
            name: "Axial Skeleton",
            children: [
              { name: "Skull", description: "Protects brain and supports face" },
              { name: "Vertebral Column", description: "28-33 vertebrae protecting spinal cord" },
              { name: "Thoracic Cage", description: "Protects heart and lungs" },
            ],
          },
          {
            name: "Appendicular Skeleton",
            children: [
              { name: "Pectoral Girdle", description: "Connects arms to body" },
              { name: "Pelvic Girdle", description: "Supports trunk and connects legs" },
              { name: "Limb Bones", description: "Long bones of arms and legs" },
            ],
          },
        ],
      },
      {
        name: "Muscular System",
        color: "#ef4444",
        children: [
          {
            name: "Skeletal Muscles",
            children: [
              { name: "Upper Limb Muscles", description: "Biceps, triceps, deltoids" },
              { name: "Lower Limb Muscles", description: "Quadriceps, hamstrings, glutes" },
              { name: "Trunk Muscles", description: "Abdominals, back extensors" },
            ],
          },
          {
            name: "Smooth & Cardiac",
            children: [
              { name: "Smooth Muscle", description: "Found in organs and blood vessels" },
              { name: "Cardiac Muscle", description: "Specialized heart muscle" },
            ],
          },
        ],
      },
      {
        name: "Cardiovascular System",
        color: "#dc2626",
        children: [
          {
            name: "Heart",
            children: [
              { name: "Atria", description: "Receive blood from veins" },
              { name: "Ventricles", description: "Pump blood to arteries" },
              { name: "Valves", description: "Prevent backflow of blood" },
            ],
          },
          {
            name: "Blood Vessels",
            children: [
              { name: "Arteries", description: "Carry oxygenated blood away from heart" },
              { name: "Veins", description: "Return deoxygenated blood to heart" },
              { name: "Capillaries", description: "Enable nutrient and gas exchange" },
            ],
          },
        ],
      },
      {
        name: "Nervous System",
        color: "#8b5cf6",
        children: [
          {
            name: "Central Nervous System",
            children: [
              { name: "Brain", description: "Control center with cerebrum, cerebellum, brainstem" },
              { name: "Spinal Cord", description: "Main pathway for neural signals" },
            ],
          },
          {
            name: "Peripheral Nervous System",
            children: [
              { name: "Somatic Nerves", description: "Voluntary skeletal muscle control" },
              { name: "Autonomic Nerves", description: "Involuntary organ function" },
            ],
          },
        ],
      },
      {
        name: "Respiratory System",
        color: "#06b6d4",
        children: [
          {
            name: "Upper Respiratory",
            children: [
              { name: "Nose & Nasal Cavity", description: "Air filtering and humidification" },
              { name: "Pharynx", description: "Throat connecting nose to lungs" },
              { name: "Larynx", description: "Voice box controlling airflow" },
            ],
          },
          {
            name: "Lower Respiratory",
            children: [
              { name: "Trachea", description: "Windpipe branching into bronchi" },
              { name: "Lungs", description: "Contain bronchioles and alveoli for gas exchange" },
              { name: "Diaphragm", description: "Primary breathing muscle" },
            ],
          },
        ],
      },
      {
        name: "Digestive System",
        color: "#10b981",
        children: [
          {
            name: "Upper GI Tract",
            children: [
              { name: "Mouth & Teeth", description: "Mechanical and chemical breakdown" },
              { name: "Esophagus", description: "Transports food to stomach" },
              { name: "Stomach", description: "Acid digestion and mixing" },
            ],
          },
          {
            name: "Lower GI Tract",
            children: [
              { name: "Small Intestine", description: "Primary nutrient absorption site" },
              { name: "Large Intestine", description: "Water absorption and fecal storage" },
              { name: "Accessory Organs", description: "Liver, pancreas, gallbladder" },
            ],
          },
        ],
      },
      {
        name: "Endocrine System",
        color: "#14b8a6",
        children: [
          {
            name: "Brain-Based Glands",
            children: [
              { name: "Pituitary Gland", description: "Master endocrine gland" },
              { name: "Hypothalamus", description: "Controls pituitary function" },
              { name: "Pineal Gland", description: "Produces melatonin" },
            ],
          },
          {
            name: "Body Glands",
            children: [
              { name: "Thyroid", description: "Regulates metabolism" },
              { name: "Pancreas", description: "Regulates blood glucose" },
              { name: "Adrenal Glands", description: "Stress response hormones" },
            ],
          },
        ],
      },
      {
        name: "Immune System",
        color: "#f87171",
        children: [
          {
            name: "Lymphoid Organs",
            children: [
              { name: "Thymus", description: "T cell development" },
              { name: "Lymph Nodes", description: "Filter lymph fluid" },
              { name: "Spleen", description: "Filters blood and stores WBCs" },
            ],
          },
          {
            name: "Defense Cells",
            children: [
              { name: "B Cells", description: "Produce antibodies" },
              { name: "T Cells", description: "Cellular immunity" },
              { name: "Phagocytes", description: "Engulf pathogens" },
            ],
          },
        ],
      },
    ],
  };

  useEffect(() => {
    if (!radialRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const radius = (width - 20) / 2;

    d3.select(radialRef.current).selectAll("*").remove();

    const svg = d3
      .select(radialRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .style("font", "12px sans-serif");

    const root = d3
      .hierarchy(vizData)
      .sum(() => 1)
      .sort((a, b) => d3.ascending(a.data.name, b.data.name));

    const tree = d3
      .tree()
      .size([2 * Math.PI, radius * 0.8])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    tree(root);

    svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "#334155")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 1.5)
      .selectAll()
      .data(root.links())
      .join("path")
      .attr(
        "d",
        d3
          .linkRadial()
          .angle((d) => d.x)
          .radius((d) => d.y),
      )
      .attr("stroke", (d) => d.target.data.color || "#64748b")
      .attr("stroke-opacity", (d) => (d.target.depth === 1 ? 0.6 : 0.3))
      .attr("stroke-width", (d) => (d.target.depth === 1 ? 2 : 1));

    const nodes = svg
      .append("g")
      .selectAll()
      .data(root.descendants())
      .join("circle")
      .attr("transform", (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`)
      .attr("fill", (d) => {
        if (d.depth === 0) return "#60a5fa";
        if (d.depth === 1) return d.data.color || "#64748b";
        return d.data.color || "#94a3b8";
      })
      .attr("r", (d) => (d.depth === 0 ? 8 : d.depth === 1 ? 6 : 4))
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => {
        onNodeHover(d.data.name);
        svg.selectAll("circle").attr("opacity", (n) => {
          let current = n;
          while (current) {
            if (current === d) return 1;
            current = current.parent;
          }
          return 0.2;
        });
        if (tooltipRef.current && d.data.description) {
          tooltipRef.current.innerHTML = `<div class="font-bold text-white mb-1">${d.data.name}</div><div class="text-xs text-slate-200">${d.data.description}</div>`;
          tooltipRef.current.style.display = "block";
          tooltipRef.current.style.left = event.pageX + 10 + "px";
          tooltipRef.current.style.top = event.pageY + 10 + "px";
        }
      })
      .on("mousemove", (event) => {
        if (tooltipRef.current && tooltipRef.current.style.display === "block") {
          tooltipRef.current.style.left = event.pageX + 10 + "px";
          tooltipRef.current.style.top = event.pageY + 10 + "px";
        }
      })
      .on("mouseleave", () => {
        onNodeHover(null);
        svg.selectAll("circle").attr("opacity", 1);
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
      });

    svg
      .append("g")
      .attr("text-anchor", "middle")
      .selectAll()
      .data(root.descendants().filter((d) => d.depth > 0))
      .join("text")
      .attr(
        "transform",
        (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0) rotate(${d.x < Math.PI ? 0 : 180})`,
      )
      .attr("dy", "0.32em")
      .attr("x", (d) => (d.x < Math.PI ? 1 : -1) * (Math.sqrt(d.y) + 4))
      .attr("fill", "#e2e8f0")
      .attr("font-size", (d) => (d.depth === 1 ? "11px" : "9px"))
      .attr("font-weight", (d) => (d.depth === 1 ? "600" : "400"))
      .style("text-anchor", (d) => (d.x < Math.PI ? "start" : "end"))
      .style("pointer-events", "none")
      .text((d) => d.data.name);
  }, [vizData, onNodeHover]);

  useEffect(() => {
    if (!verticalRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const margin = { top: 60, right: 60, bottom: 60, left: 60 };

    d3.select(verticalRef.current).selectAll("*").remove();

    const svg = d3
      .select(verticalRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const root = d3
      .hierarchy(vizData)
      .sum(() => 1)
      .sort((a, b) => d3.ascending(a.data.name, b.data.name));

    const tree = d3.tree().size([width - margin.left - margin.right, height - margin.top - margin.bottom]);

    tree(root);

    svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .selectAll()
      .data(root.links())
      .join("path")
      .attr(
        "d",
        d3
          .linkVertical()
          .x((d) => d.x)
          .y((d) => d.y),
      )
      .attr("stroke", (d) => d.target.data.color || "#64748b");

    svg
      .append("g")
      .selectAll()
      .data(root.descendants())
      .join("circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("fill", (d) => {
        if (d.depth === 0) return "#60a5fa";
        if (d.depth === 1) return d.data.color || "#64748b";
        return d.data.color || "#94a3b8";
      })
      .attr("r", (d) => (d.depth === 0 ? 8 : d.depth === 1 ? 6 : 4))
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => {
        if (tooltipRef.current && d.data.description) {
          tooltipRef.current.innerHTML = `<div class="font-bold text-white mb-1">${d.data.name}</div><div class="text-xs text-slate-200">${d.data.description}</div>`;
          tooltipRef.current.style.display = "block";
          tooltipRef.current.style.left = event.pageX + 10 + "px";
          tooltipRef.current.style.top = event.pageY + 10 + "px";
        }
      })
      .on("mouseleave", () => {
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
      });

    svg
      .append("g")
      .attr("text-anchor", "middle")
      .selectAll()
      .data(root.descendants())
      .join("text")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y - 15)
      .attr("fill", "#e2e8f0")
      .attr("font-size", (d) => (d.depth === 0 ? "12px" : d.depth === 1 ? "11px" : "9px"))
      .attr("font-weight", (d) => (d.depth <= 1 ? "600" : "400"))
      .style("pointer-events", "none")
      .text((d) => (d.depth > 2 ? d.data.name.substring(0, 12) : d.data.name));
  }, [vizData, onNodeHover]);

  useEffect(() => {
    if (!horizontalRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const margin = { top: 60, right: 60, bottom: 60, left: 60 };

    d3.select(horizontalRef.current).selectAll("*").remove();

    const svg = d3
      .select(horizontalRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const root = d3
      .hierarchy(vizData)
      .sum(() => 1)
      .sort((a, b) => d3.ascending(a.data.name, b.data.name));

    const tree = d3.tree().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

    tree(root);

    svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .selectAll()
      .data(root.links())
      .join("path")
      .attr(
        "d",
        d3
          .linkHorizontal()
          .x((d) => d.y)
          .y((d) => d.x),
      )
      .attr("stroke", (d) => d.target.data.color || "#64748b");

    svg
      .append("g")
      .selectAll()
      .data(root.descendants())
      .join("circle")
      .attr("cx", (d) => d.y)
      .attr("cy", (d) => d.x)
      .attr("fill", (d) => {
        if (d.depth === 0) return "#60a5fa";
        if (d.depth === 1) return d.data.color || "#64748b";
        return d.data.color || "#94a3b8";
      })
      .attr("r", (d) => (d.depth === 0 ? 8 : d.depth === 1 ? 6 : 4))
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => {
        if (tooltipRef.current && d.data.description) {
          tooltipRef.current.innerHTML = `<div class="font-bold text-white mb-1">${d.data.name}</div><div class="text-xs text-slate-200">${d.data.description}</div>`;
          tooltipRef.current.style.display = "block";
          tooltipRef.current.style.left = event.pageX + 10 + "px";
          tooltipRef.current.style.top = event.pageY + 10 + "px";
        }
      })
      .on("mouseleave", () => {
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
      });

    svg
      .append("g")
      .attr("text-anchor", "start")
      .selectAll()
      .data(root.descendants())
      .join("text")
      .attr("x", (d) => d.y + 10)
      .attr("y", (d) => d.x)
      .attr("fill", "#e2e8f0")
      .attr("font-size", (d) => (d.depth === 0 ? "12px" : d.depth === 1 ? "11px" : "9px"))
      .attr("font-weight", (d) => (d.depth <= 1 ? "600" : "400"))
      .attr("dominant-baseline", "middle")
      .style("pointer-events", "none")
      .text((d) => (d.depth > 2 ? d.data.name.substring(0, 15) : d.data.name));
  }, [vizData, onNodeHover]);

  useEffect(() => {
    if (!sunburstRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    d3.select(sunburstRef.current).selectAll("*").remove();

    const svg = d3
      .select(sunburstRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .style("font", "12px sans-serif");

    const root = d3
      .hierarchy(vizData)
      .sum(() => 1)
      .sort((a, b) => d3.ascending(a.data.name, b.data.name));

    const partition = d3.partition().size([2 * Math.PI, width / 2]);

    partition(root);

    const arcs = svg
      .append("g")
      .selectAll()
      .data(root.descendants())
      .join("path")
      .attr("fill", (d) => {
        if (d.depth === 0) return "#60a5fa";
        if (d.depth === 1) return d.data.color || "#64748b";
        return d.data.color || "#94a3b8";
      })
      .attr("fill-opacity", (d) => (d.depth === 0 ? 1 : d.depth === 1 ? 0.8 : 0.6))
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 1)
      .attr(
        "d",
        d3
          .arc()
          .startAngle((d) => d.x0)
          .endAngle((d) => d.x1)
          .innerRadius((d) => d.y0)
          .outerRadius((d) => d.y1),
      )
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => {
        if (tooltipRef.current && d.data.description) {
          tooltipRef.current.innerHTML = `<div class="font-bold text-white mb-1">${d.data.name}</div><div class="text-xs text-slate-200">${d.data.description}</div>`;
          tooltipRef.current.style.display = "block";
          tooltipRef.current.style.left = event.pageX + 10 + "px";
          tooltipRef.current.style.top = event.pageY + 10 + "px";
        }
      })
      .on("mouseleave", () => {
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
      });

    svg
      .append("g")
      .selectAll()
      .data(root.descendants().filter((d) => d.depth > 0 && d.depth <= 2))
      .join("text")
      .attr("transform", (d) => {
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI - 90;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", (d) => (d.depth === 1 ? "11px" : "9px"))
      .attr("font-weight", (d) => (d.depth === 1 ? "600" : "400"))
      .style("pointer-events", "none")
      .text((d) => (d.depth === 1 ? d.data.name : d.data.name.substring(0, 12)));
  }, [vizData, onNodeHover]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 px-6 py-8 backdrop-blur">
        <h1 className="text-3xl font-bold text-white">{vizData.name} Dendrogram Guide</h1>
        <p className="mt-2 text-slate-400">
          Explore 4 interactive visualizations of the hierarchical structure. Scroll horizontally to view each layout.
        </p>
      </div>

      <div className="flex overflow-x-auto snap-x snap-mandatory">
        {/* Radial Tree */}
        <div className="w-screen flex-shrink-0 snap-center flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <h2 className="mb-4 text-2xl font-semibold text-white">Radial Dendrogram</h2>
          <div className="flex justify-center">
            <svg ref={radialRef} className="max-h-[70vh] w-[70vh]" />
          </div>
          <p className="mt-4 text-center text-sm text-slate-400">Circular hierarchical layout radiating from center</p>
        </div>

        {/* Vertical Tree */}
        <div className="w-screen flex-shrink-0 snap-center flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <h2 className="mb-4 text-2xl font-semibold text-white">Vertical Dendrogram</h2>
          <div className="overflow-auto max-h-[70vh]">
            <svg ref={verticalRef} className="h-full w-full min-w-max" />
          </div>
          <p className="mt-4 text-center text-sm text-slate-400">Top-down hierarchical tree structure</p>
        </div>

        {/* Horizontal Tree */}
        <div className="w-screen flex-shrink-0 snap-center flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <h2 className="mb-4 text-2xl font-semibold text-white">Horizontal Dendrogram</h2>
          <div className="overflow-auto max-h-[70vh]">
            <svg ref={horizontalRef} className="h-full w-full min-w-max" />
          </div>
          <p className="mt-4 text-center text-sm text-slate-400">Left-right hierarchical tree layout</p>
        </div>

        {/* Sunburst */}
        <div className="w-screen flex-shrink-0 snap-center flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <h2 className="mb-4 text-2xl font-semibold text-white">Sunburst Diagram</h2>
          <div className="flex justify-center">
            <svg ref={sunburstRef} className="max-h-[70vh] w-[70vh]" />
          </div>
          <p className="mt-4 text-center text-sm text-slate-400">Concentric rings showing nested hierarchy</p>
        </div>
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="pointer-events-none fixed hidden rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm shadow-lg"
        style={{ zIndex: 1000 }}
      />
    </div>
  );
}

export default {
  TidyTree,
  RadialDendrogram,
  RadialTidyTree,
  TreemapVisualization,
  SunburstVisualization,
  ScrollableDendrograms,
};

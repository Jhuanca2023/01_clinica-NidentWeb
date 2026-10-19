export function reservationChart(series: { date: string; total: number }[]) {
  const max = Math.max(
    2,
    Math.ceil(Math.max(0, ...series.map((point) => point.total)) / 2) * 2,
  );
  const top = 22,
    bottom = 198,
    left = 34,
    right = 730;
  const points = series.map((point, index) => ({
    ...point,
    x: left + (index / Math.max(1, series.length - 1)) * (right - left),
    y: bottom - (point.total / max) * (bottom - top),
    label: new Intl.DateTimeFormat("es-PE", {
      day: "numeric",
      month: "short",
    }).format(new Date(point.date + "T12:00:00")),
  }));
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  return {
    points,
    max,
    line,
    area: line ? line + ` L${right},${bottom} L${left},${bottom} Z` : "",
    ticks: [0, 0.5, 1].map((value) => ({
      y: bottom - value * (bottom - top),
      label: Math.round(max * value),
    })),
    labels: points.filter(
      (_, index) =>
        index === series.length - 1 ||
        index % Math.max(1, Math.ceil(series.length / 6)) === 0,
    ),
  };
}

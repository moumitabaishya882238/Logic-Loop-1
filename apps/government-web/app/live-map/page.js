import SectionPageShell from "../../components/SectionPageShell";

export default function LiveMapPage() {
  return (
    <SectionPageShell
      eyebrow="SurakshaNet Monitoring"
      title="Live Map"
      description="This page will visualize incident markers, responder movement, and safety hotspots on the national command map."
      bullets={[
        "Integrate Leaflet or Mapbox map canvas",
        "Render SOS, CCTV, disaster, and responder markers",
        "Show marker popups with incident details"
      ]}
    />
  );
}
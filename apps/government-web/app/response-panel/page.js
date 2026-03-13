import SectionPageShell from "../../components/SectionPageShell";

export default function ResponsePanelPage() {
  return (
    <SectionPageShell
      eyebrow="SurakshaNet Operations"
      title="Response Panel"
      description="This page will help authorities and NGOs assign teams, manage response workflows, and track incident resolution progress."
      bullets={[
        "Show available responders and assigned missions",
        "Support incident acceptance and team dispatch",
        "Track mission progress through completion"
      ]}
    />
  );
}
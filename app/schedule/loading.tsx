import { JadePageLoader } from "@/components/jade-page-loader"

export default function ScheduleLoading() {
  return (
    <JadePageLoader
      kanji="約"
      label="Loading schedule…"
      showCards
    />
  )
}

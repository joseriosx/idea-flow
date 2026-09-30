import { BrandMark } from './chrome/BrandMark'
import { ContextBar } from './chrome/ContextBar'
import { ControlCluster } from './chrome/ControlCluster'
import { HintBar } from './chrome/HintBar'
import { Legend } from './chrome/Legend'
import { NodeRail } from './chrome/NodeRail'
import { StatusCluster } from './chrome/StatusCluster'
import { FirstRun } from './FirstRun'
import { Inspector } from './Inspector'
import { Toaster } from './Toaster'

/**
 * Everything that is not the canvas.
 *
 * The board is the subject, so the interface stays on the edges of the frame
 * and never over it: identity top left, relation mode top centre, health top
 * right, creation on the left rail, one contextual panel on the right, camera
 * bottom right. The middle belongs to the graph.
 */
export function Chrome() {
  return (
    <>
      <BrandMark />
      <ContextBar />
      <StatusCluster />
      <NodeRail />
      <Inspector />
      <Legend />
      <ControlCluster />
      <HintBar />
      <FirstRun />
      <Toaster />
    </>
  )
}

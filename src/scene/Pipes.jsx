import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CONFIG } from '../game/engine'

const PIPE_COLOR = '#4fae53'
const RIM_COLOR = '#3d8f42'

function PipePair({ game, index }) {
  const group = useRef()
  const bottom = useRef()
  const bottomRim = useRef()
  const top = useRef()
  const topRim = useRef()

  useFrame(() => {
    const slot = game.slots[index]
    const g = group.current
    if (!g) return
    if (!slot.active) {
      if (g.visible) g.visible = false
      return
    }
    g.visible = true
    g.position.z = slot.z

    const gapTop = slot.gapY + slot.gap / 2
    const gapBottom = slot.gapY - slot.gap / 2
    const floor = CONFIG.floor - 0.1

    const hBottom = Math.max(0.2, gapBottom - floor)
    bottom.current.scale.y = hBottom
    bottom.current.position.y = floor + hBottom / 2
    bottomRim.current.position.y = gapBottom - 0.19

    const hTop = 34
    top.current.scale.y = hTop
    top.current.position.y = gapTop + hTop / 2
    topRim.current.position.y = gapTop + 0.19
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={bottom} castShadow receiveShadow>
        <cylinderGeometry args={[CONFIG.pipeRadius, CONFIG.pipeRadius, 1, 22, 1]} />
        <meshStandardMaterial color={PIPE_COLOR} roughness={0.55} metalness={0.08} />
      </mesh>
      <mesh ref={bottomRim} castShadow>
        <cylinderGeometry args={[CONFIG.pipeRadius * 1.14, CONFIG.pipeRadius * 1.14, 0.38, 24]} />
        <meshStandardMaterial color={RIM_COLOR} roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh ref={top} castShadow receiveShadow>
        <cylinderGeometry args={[CONFIG.pipeRadius, CONFIG.pipeRadius, 1, 22, 1]} />
        <meshStandardMaterial color={PIPE_COLOR} roughness={0.55} metalness={0.08} />
      </mesh>
      <mesh ref={topRim} castShadow>
        <cylinderGeometry args={[CONFIG.pipeRadius * 1.14, CONFIG.pipeRadius * 1.14, 0.38, 24]} />
        <meshStandardMaterial color={RIM_COLOR} roughness={0.45} metalness={0.15} />
      </mesh>
    </group>
  )
}

export default function Pipes({ game }) {
  return (
    <group>
      {game.slots.map((_, i) => (
        <PipePair key={i} game={game} index={i} />
      ))}
    </group>
  )
}

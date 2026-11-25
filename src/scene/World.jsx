import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CONFIG } from '../game/engine'

/** Moves each child towards the camera on the Z axis and wraps it back. */
function Field({ game, items, span, wrapAt = 44 }) {
  const refs = useRef([])
  useFrame((_, dt) => {
    const d = Math.min(dt, 1 / 30)
    for (let i = 0; i < items.length; i++) {
      const m = refs.current[i]
      if (!m) continue
      m.position.z += game.speed * d * items[i].factor
      if (m.position.z > wrapAt) m.position.z -= span
    }
  })
  return (
    <>
      {items.map((it, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)} position={it.pos}>
          {it.node}
        </group>
      ))}
    </>
  )
}

function Cloud({ scale = 1 }) {
  const puffs = [
    [0, 0, 0, 1],
    [1.5, 0.15, 0.2, 0.78],
    [-1.5, 0.05, -0.15, 0.7],
    [0.6, 0.62, 0.1, 0.62],
    [-0.7, 0.5, 0.05, 0.55],
  ]
  return (
    <group scale={scale}>
      {puffs.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} scale={[s * 1.35, s * 0.92, s * 1.15]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#ffffff" roughness={1} flatShading transparent opacity={0.95} />
        </mesh>
      ))}
    </group>
  )
}

function Tree({ tall = 3.4 }) {
  return (
    <group>
      <mesh position={[0, tall * 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.3, tall * 0.62, 7]} />
        <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
      </mesh>
      <mesh position={[0, tall * 0.85, 0]} castShadow>
        <coneGeometry args={[1.5, tall * 1.15, 8]} />
        <meshStandardMaterial color="#2f7d43" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, tall * 0.55, 0]} castShadow>
        <coneGeometry args={[1.85, tall * 0.8, 8]} />
        <meshStandardMaterial color="#3c9450" roughness={0.85} flatShading />
      </mesh>
    </group>
  )
}

function Rock({ s = 1 }) {
  return (
    <mesh castShadow receiveShadow position={[0, 0.25 * s, 0]} scale={[s, s * 0.8, s]}>
      <dodecahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color="#8496a6" roughness={0.95} flatShading />
    </mesh>
  )
}

export default function World({ game }) {
  const groundY = CONFIG.floor

  const stripes = useMemo(() => {
    const span = 156
    return Array.from({ length: 26 }, (_, i) => ({
      factor: 1,
      pos: [0, groundY + 0.02, 40 - (i * span) / 26],
      node: (
        <mesh receiveShadow>
          <boxGeometry args={[34, 0.04, 1.15]} />
          <meshStandardMaterial color="#6cbb5d" roughness={0.95} />
        </mesh>
      ),
    }))
  }, [groundY])

  const sideTrees = useMemo(() => {
    const span = 170
    const nodes = []
    for (let i = 0; i < 7; i++) {
      for (const s of [-1, 1]) {
        nodes.push({
          factor: 1,
          pos: [s * (13 + Math.random() * 5), groundY, 34 - (i * span) / 7 - Math.random() * 10],
          node: <Tree tall={2.8 + Math.random() * 2.4} />,
        })
      }
    }
    return nodes
  }, [groundY])

  const rocks = useMemo(() => {
    const span = 170
    return Array.from({ length: 8 }, (_, i) => ({
      factor: 1,
      pos: [Math.random() > 0.5 ? 7.5 + Math.random() * 3 : -7.5 - Math.random() * 3, groundY, 30 - (i * span) / 8],
      node: <Rock s={0.8 + Math.random() * 0.9} />,
    }))
  }, [groundY])

  const clouds = useMemo(() => {
    const span = 200
    return Array.from({ length: 9 }, (_, i) => ({
      factor: 0.35,
      pos: [
        (i % 2 === 0 ? -1 : 1) * (8 + Math.random() * 26),
        9 + Math.random() * 14,
        36 - (i * span) / 9 - Math.random() * 12,
      ],
      node: <Cloud scale={1.6 + Math.random() * 2.4} />,
    }))
  }, [])

  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, groundY, -60]} receiveShadow>
        <planeGeometry args={[420, 460]} />
        <meshStandardMaterial color="#57a24c" roughness={1} />
      </mesh>

      <Field game={game} items={stripes} span={156} />
      <Field game={game} items={rocks} span={170} />
      <Field game={game} items={sideTrees} span={170} />
      <Field game={game} items={clouds} span={200} wrapAt={52} />

      {/* distant hills */}
      {[
        [-70, -150, 60, 34],
        [-10, -185, 90, 46],
        [60, -140, 55, 30],
        [110, -210, 80, 40],
      ].map(([x, z, r, h], i) => (
        <mesh key={i} position={[x, groundY, z]}>
          <coneGeometry args={[r, h, 5]} />
          <meshStandardMaterial color="#8fb4c4" roughness={1} flatShading />
        </mesh>
      ))}

      {/* sun */}
      <mesh position={[70, 46, -230]}>
        <sphereGeometry args={[16, 24, 16]} />
        <meshBasicMaterial color="#fff6cf" />
      </mesh>
      <mesh position={[70, 46, -232]}>
        <sphereGeometry args={[28, 24, 16]} />
        <meshBasicMaterial color="#ffe9a3" transparent opacity={0.28} />
      </mesh>
    </group>
  )
}

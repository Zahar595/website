import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/** Low-poly bird, faces -Z (into the screen). */
export default function Bird({ game }) {
  const root = useRef()
  const leftWing = useRef()
  const rightWing = useRef()
  const tail = useRef()

  useFrame(() => {
    const b = game.bird
    if (!root.current) return
    root.current.position.y = b.y
    root.current.rotation.x = b.rot
    root.current.rotation.z = Math.sin(game.time * 3.1) * 0.05
    const flap = Math.sin(b.flapPhase) * (0.5 + b.flapBoost * 0.85)
    if (leftWing.current) leftWing.current.rotation.z = 0.42 + flap
    if (rightWing.current) rightWing.current.rotation.z = -0.42 - flap
    if (tail.current) tail.current.rotation.x = 0.1 + Math.sin(game.time * 6) * 0.07
  })

  return (
    <group ref={root} position={[0, 1.4, 0]}>
      {/* body */}
      <mesh castShadow scale={[1, 0.92, 1.18]}>
        <sphereGeometry args={[0.62, 26, 20]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.5} metalness={0.05} />
      </mesh>
      {/* belly */}
      <mesh position={[0, -0.16, -0.04]} scale={[0.86, 0.78, 1.02]}>
        <sphereGeometry args={[0.56, 22, 16]} />
        <meshStandardMaterial color="#fff4bd" roughness={0.75} />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.2, -0.52]} castShadow>
        <sphereGeometry args={[0.44, 24, 18]} />
        <meshStandardMaterial color="#ffd93d" roughness={0.45} />
      </mesh>
      {/* tuft */}
      <mesh position={[0, 0.62, -0.44]} rotation={[-0.35, 0, 0]}>
        <coneGeometry args={[0.1, 0.34, 8]} />
        <meshStandardMaterial color="#f7b731" roughness={0.6} />
      </mesh>
      {/* beak */}
      <mesh position={[0, 0.12, -1.0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.17, 0.46, 12]} />
        <meshStandardMaterial color="#ff8f2e" roughness={0.35} />
      </mesh>
      {/* eyes */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.19, 0.3, -0.76]}>
          <mesh>
            <sphereGeometry args={[0.145, 16, 14]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[s * 0.02, 0.01, -0.1]}>
            <sphereGeometry args={[0.075, 14, 12]} />
            <meshStandardMaterial color="#20120a" roughness={0.1} />
          </mesh>
        </group>
      ))}
      {/* wings */}
      <group ref={leftWing} position={[0.44, 0.06, 0.02]}>
        <mesh position={[0.36, 0, 0]} scale={[1.25, 0.2, 0.8]} castShadow>
          <sphereGeometry args={[0.5, 18, 12]} />
          <meshStandardMaterial color="#f7c948" roughness={0.6} />
        </mesh>
      </group>
      <group ref={rightWing} position={[-0.44, 0.06, 0.02]}>
        <mesh position={[-0.36, 0, 0]} scale={[1.25, 0.2, 0.8]} castShadow>
          <sphereGeometry args={[0.5, 18, 12]} />
          <meshStandardMaterial color="#f7c948" roughness={0.6} />
        </mesh>
      </group>
      {/* tail */}
      <group ref={tail} position={[0, 0.06, 0.62]}>
        <mesh position={[0, 0.02, 0.18]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.5]} castShadow>
          <coneGeometry args={[0.3, 0.62, 10]} />
          <meshStandardMaterial color="#ffb020" roughness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

import { useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Bird from './Bird'
import Pipes from './Pipes'
import World from './World'
import { CONFIG, step } from '../game/engine'

function SkyDome() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color('#1f7ad4') },
        midColor: { value: new THREE.Color('#8ecbf0') },
        bottomColor: { value: new THREE.Color('#e6f4fd') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vPos;
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        void main() {
          float h = normalize(vPos).y;
          vec3 c = mix(bottomColor, midColor, smoothstep(-0.12, 0.22, h));
          c = mix(c, topColor, smoothstep(0.18, 0.9, h));
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    })
  }, [])

  return (
    <mesh material={material} position={[0, 0, -40]} scale={[1, 1, 1]}>
      <sphereGeometry args={[380, 32, 24]} />
    </mesh>
  )
}

function GameLoop({ game }) {
  useFrame((_, dt) => step(game, dt))
  return null
}

function CameraRig({ game }) {
  useFrame((state, dt) => {
    const cam = state.camera
    const k = Math.min(1, dt * 3.2)
    const targetY = 2.7 + game.bird.y * 0.3
    cam.position.y += (targetY - cam.position.y) * k
    cam.position.z += (15.6 - cam.position.z) * k
    const shake = game.shake
    cam.position.x = 1.15 + (Math.random() - 0.5) * shake * 0.9
    cam.position.y += (Math.random() - 0.5) * shake * 0.5
    cam.lookAt(0, game.bird.y * 0.5 + 0.3, -12)
  })
  return null
}

export default function Scene({ game }) {
  return (
    <Canvas
      shadows
      flat
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [1.15, 2.7, 15.6], fov: 56, near: 0.1, far: 700 }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      <SkyDome />
      <fog attach="fog" args={['#c3e1f3', 60, 205]} />

      <hemisphereLight args={['#dff1ff', '#3f7d38', 0.85]} />
      <ambientLight intensity={0.28} />
      <directionalLight
        position={[22, 34, 16]}
        intensity={1.85}
        color="#fff6e2"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={34}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-18, 12, -22]} intensity={0.4} color="#bfe0ff" />

      <GameLoop game={game} />
      <CameraRig game={game} />

      <World game={game} />
      <Pipes game={game} />
      <Bird game={game} />

      {/* invisible walls keep the corridor readable */}
      <mesh position={[0, CONFIG.floor, 0]} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </Canvas>
  )
}

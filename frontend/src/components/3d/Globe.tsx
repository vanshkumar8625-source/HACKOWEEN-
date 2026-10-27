import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

export const Globe = () => {
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y = clock.getElapsedTime() * 0.02; // Slower, calmer rotation
    }
  });

  return (
    <group>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#00B4D8" /> {/* Medical Cyan light */}
      <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#F8F9FA" /> {/* Warm white bounce */}
      
      {/* Core Earth Sphere - Professional dark wireframe */}
      <Sphere ref={sphereRef} args={[2.5, 64, 64]} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color="#1C2A43" 
          roughness={0.7} 
          metalness={0.2}
          wireframe={true}
          transparent
          opacity={0.3}
        />
      </Sphere>
      
      {/* Solid inner core for depth */}
      <Sphere args={[2.45, 32, 32]} position={[0, 0, 0]}>
        <meshBasicMaterial color="#0A1128" />
      </Sphere>
      
      {/* Outer atmosphere halo */}
      <Sphere args={[2.6, 32, 32]} position={[0, 0, 0]}>
        <meshBasicMaterial color="#00B4D8" transparent opacity={0.03} side={THREE.BackSide} />
      </Sphere>
    </group>
  );
};

import * as THREE from 'three';

export function createArmSolver(root: THREE.Group, joints: THREE.Group[], axes: THREE.Vector3[], tip: THREE.Object3D) {
  // Only the centerline transforms affect IK. Decorative meshes, lights, and
  // halos are updated once by the renderer, not for every joint adjustment.
  const chain: THREE.Object3D[] = [];
  for (let node: THREE.Object3D | null = tip; node && node !== root; node = node.parent) chain.unshift(node);
  const jointIndices = joints.map(joint => chain.indexOf(joint));
  const origin = new THREE.Vector3(), end = new THREE.Vector3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), axis = new THREE.Vector3(), cross = new THREE.Vector3();
  const rotation = new THREE.Quaternion();

  function updateChain(start: number) {
    for (let i = start; i < chain.length; i++) {
      const node = chain[i];
      node.updateMatrix();
      node.matrixWorld.multiplyMatrices(node.parent!.matrixWorld, node.matrix);
    }
  }

  return (target: THREE.Vector3, time: number) => {
    joints[5].quaternion.setFromAxisAngle(axes[5], Math.sin(time * 0.7) * 0.6);
    root.updateWorldMatrix(true, false);
    updateChain(0);
    for (let iteration = 0; iteration < 8; iteration++) {
      for (let i = joints.length - 1; i >= 0; i--) {
        origin.setFromMatrixPosition(joints[i].matrixWorld);
        end.setFromMatrixPosition(tip.matrixWorld);
        axis.copy(axes[i]).transformDirection(joints[i].matrixWorld);
        a.copy(end).sub(origin); b.copy(target).sub(origin);
        a.addScaledVector(axis, -a.dot(axis)); b.addScaledVector(axis, -b.dot(axis));
        if (a.lengthSq() < 1e-8 || b.lengthSq() < 1e-8) continue;
        a.normalize(); b.normalize();
        const angle = Math.atan2(axis.dot(cross.crossVectors(a, b)), a.dot(b));
        rotation.setFromAxisAngle(axes[i], THREE.MathUtils.clamp(angle, -0.22, 0.22));
        joints[i].quaternion.multiply(rotation);
        updateChain(jointIndices[i]);
      }
    }
  };
}

uniform float time;
varying vec3 vUv;

void main() {
    vec3 modifiedPosition = position;          
    modifiedPosition.z += 0.1 * sin(modifiedPosition.x * 30.0 + time); 
    vUv = vec3(uv, 0.0);                     
    gl_Position = projectionMatrix * modelViewMatrix * vec4(modifiedPosition, 1.0);
}
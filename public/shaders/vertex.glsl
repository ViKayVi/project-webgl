uniform float uTime;
uniform float uScrollProgress;
uniform vec2 uResolution;

varying vec2 vUv;
varying vec3 vPosition;
varying float vDistortion;

void main() {
    vUv = uv;
    vPosition = position;
    
    // Calcular la distancia desde el centro de la esfera
    vec2 center = vec2(0.0, 0.0);
    float distance = length(position.xy - center);
    
    // Factor de distorsión basado en la distancia y el scroll
    vDistortion = smoothstep(0.0, 2.0, distance) * uScrollProgress;
    
    vec3 pos = position;
    
    // Aplicar deformación basada en el scroll
    float scale = 1.0 + uScrollProgress * 2.0;
    pos *= scale;
    
    // Rotación sutil
    float angle = uTime * 0.5 + uScrollProgress * 3.14159;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    pos.xy = rotation * pos.xy;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
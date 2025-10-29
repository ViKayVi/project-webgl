uniform float uTime;
uniform float uScrollProgress;
uniform vec2 uResolution;

varying vec2 vUv;
varying vec3 vPosition;
varying float vDistortion;

void main() {
    vec3 color = vec3(0.0, 1.0, 0.0);
    
    float pattern = sin(vPosition.x * 10.0 + uTime) * cos(vPosition.y * 10.0 + uTime);
    pattern *= vDistortion;
    color += pattern * 0.3;
    float alpha = 0.1 + uScrollProgress * 0.4;
    
    gl_FragColor = vec4(color, alpha);
}
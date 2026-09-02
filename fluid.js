// Liquid Fluid — Framer Component
import{jsx as _jsx,jsxs as _jsxs}from"react/jsx-runtime";import{useEffect,useRef,useState}from"react";import{addPropertyControls,ControlType}from"framer";/**
 * @framerDisableUnlink
 *
 * @framerIntrinsicWidth 200
 * @framerIntrinsicHeight 200
 */export default function LiquidFluid(props){const{SIM_RESOLUTION=128,DYE_RESOLUTION=1024,DENSITY_DISSIPATION=1.6,VELOCITY_DISSIPATION=1.47,PRESSURE=.42,PRESSURE_ITERATIONS=10,CURL=11,SPLAT_RADIUS=.11,SPLAT_FORCE=6e3,SHADING=true,COLORFUL=false,COLOR_UPDATE_SPEED=10,PAUSED=false,TRANSPARENT=false,BLOOM=true,BLOOM_ITERATIONS=8,BLOOM_RESOLUTION=256,BLOOM_INTENSITY=.47,BLOOM_THRESHOLD=.22,BLOOM_SOFT_KNEE=.7,SUNRAYS=true,SUNRAYS_RESOLUTION=196,SUNRAYS_WEIGHT=.5,BACK_COLOR="#000000",USE_BRAND_COLORS=false,BRAND_COLORS=["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7"],BRAND_COLOR_INTENSITY=.15,// ── Autoplay ──────────────────────────────────────────────────
AUTOPLAY=true,AUTOPLAY_INTERVAL=3,AUTOPLAY_COUNT=5,// ── Keyboard color cycling ─────────────────────────────────────
KEYBOARD_COLOR_NAV=true}=props;const canvasRef=useRef(null);// ── Toast state (driven by keyboard arrow presses) ───────────────────────
const[toastVisible,setToastVisible]=useState(false);const[colorNavIndex,setColorNavIndex]=useState(0);const toastTimerRef=useRef(null);// 12 named hues — map 1:1 to the hue steps used in the WebGL effect
const NAMED_COLORS=[{name:"Red",r:1,g:.1,b:.1},{name:"Orange",r:1,g:.5,b:.05},{name:"Yellow",r:1,g:.9,b:.05},{name:"Lime",r:.5,g:1,b:.05},{name:"Green",r:.05,g:.9,b:.2},{name:"Teal",r:.05,g:.9,b:.7},{name:"Cyan",r:.05,g:.8,b:1},{name:"Sky",r:.1,g:.5,b:1},{name:"Blue",r:.15,g:.15,b:1},{name:"Violet",r:.55,g:.1,b:1},{name:"Pink",r:1,g:.1,b:.8},{name:"Rose",r:1,g:.1,b:.4}];useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;// ── Color parsing ───────────────────────────────────────────────
// Handles any format Framer emits: #hex, rgb(), rgba(), hsl()
function parseColorToRGB(colorStr){if(!colorStr||typeof colorStr!=="string")return null;const s=colorStr.trim();if(s.startsWith("#")){let h=s.replace("#","");if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];if(h.length!==6)return null;return{r:parseInt(h.substring(0,2),16)/255,g:parseInt(h.substring(2,4),16)/255,b:parseInt(h.substring(4,6),16)/255};}const rgbMatch=s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);if(rgbMatch){return{r:parseFloat(rgbMatch[1])/255,g:parseFloat(rgbMatch[2])/255,b:parseFloat(rgbMatch[3])/255};}try{const tmp=document.createElement("canvas");tmp.width=tmp.height=1;const c2=tmp.getContext("2d");c2.fillStyle=s;c2.fillRect(0,0,1,1);const d=c2.getImageData(0,0,1,1).data;return{r:d[0]/255,g:d[1]/255,b:d[2]/255};}catch(e){return null;}}// ── Brand colors ────────────────────────────────────────────────
const validBrandColors=USE_BRAND_COLORS&&Array.isArray(BRAND_COLORS)?BRAND_COLORS.map(parseColorToRGB).filter(Boolean):[];let brandColorIndex=0;function generateColor(){if(validBrandColors.length>0){const{r,g,b}=validBrandColors[brandColorIndex%validBrandColors.length];brandColorIndex++;const intensity=Math.max(.01,Math.min(1,BRAND_COLOR_INTENSITY));return{r:r*intensity,g:g*intensity,b:b*intensity};}const c=HSVtoRGB(Math.random(),1,1);c.r*=.15;c.g*=.15;c.b*=.15;return c;}// ── WebGL init ──────────────────────────────────────────────────
function getWebGLContext(canvas){const params={alpha:true,depth:false,stencil:false,antialias:false,preserveDrawingBuffer:false};let gl=canvas.getContext("webgl2",params);const isWebGL2=!!gl;if(!isWebGL2)gl=canvas.getContext("webgl",params)||canvas.getContext("experimental-webgl",params);if(!gl)return null;let halfFloat,supportLinearFiltering;if(isWebGL2){gl.getExtension("EXT_color_buffer_float");supportLinearFiltering=gl.getExtension("OES_texture_float_linear");}else{halfFloat=gl.getExtension("OES_texture_half_float");supportLinearFiltering=gl.getExtension("OES_texture_half_float_linear");}const halfFloatTexType=isWebGL2?gl.HALF_FLOAT:halfFloat?halfFloat.HALF_FLOAT_OES:gl.UNSIGNED_BYTE;function supportRenderTextureFormat(internalFormat,format,type){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,internalFormat,4,4,0,format,type,null);const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);return gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;}function getSupportedFormat(internalFormat,format,type){if(!supportRenderTextureFormat(internalFormat,format,type)){if(internalFormat===gl.R16F)return getSupportedFormat(gl.RG16F,gl.RG,type);if(internalFormat===gl.RG16F)return getSupportedFormat(gl.RGBA16F,gl.RGBA,type);return null;}return{internalFormat,format};}let formatRGBA,formatRG,formatR;if(isWebGL2){formatRGBA=getSupportedFormat(gl.RGBA16F,gl.RGBA,halfFloatTexType);formatRG=getSupportedFormat(gl.RG16F,gl.RG,halfFloatTexType);formatR=getSupportedFormat(gl.R16F,gl.RED,halfFloatTexType);}else{formatRGBA=getSupportedFormat(gl.RGBA,gl.RGBA,halfFloatTexType);formatRG=getSupportedFormat(gl.RGBA,gl.RGBA,halfFloatTexType);formatR=getSupportedFormat(gl.RGBA,gl.RGBA,halfFloatTexType);}if(!formatRGBA){console.warn("LiquidFluid: no supported render texture format.");return null;}if(!formatRG)formatRG=formatRGBA;if(!formatR)formatR=formatRGBA;return{gl,ext:{formatRGBA,formatRG,formatR,halfFloatTexType,supportLinearFiltering}};}const ctx=getWebGLContext(canvas);if(!ctx){canvas.style.display="none";const parent=canvas.parentElement;if(parent&&!parent.querySelector("[data-fluid-fallback]")){const fallback=document.createElement("div");fallback.setAttribute("data-fluid-fallback","1");fallback.style.cssText="position:absolute;inset:0;display:flex;align-items:center;"+"justify-content:center;flex-direction:column;gap:8px;"+"font-family:sans-serif;color:rgba(255,255,255,0.5);"+"font-size:13px;letter-spacing:0.05em;";fallback.innerHTML='<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">'+'<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" opacity="0.3"/>'+'<path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4z"/>'+'<path d="M12 2v4M12 18v4M2 12h4M18 12h4" opacity="0.5"/></svg>'+"<span>Liquid Fluid</span>"+'<span style="font-size:11px;opacity:0.4">Live on published site</span>';parent.appendChild(fallback);}return;}const{gl,ext}=ctx;const linearFiltering=ext.supportLinearFiltering?gl.LINEAR:gl.NEAREST;// ── Shaders ─────────────────────────────────────────────────────
function compileShader(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);return shader;}function createProgram(vertSrc,fragSrc){const program=gl.createProgram();gl.attachShader(program,compileShader(gl.VERTEX_SHADER,vertSrc));gl.attachShader(program,compileShader(gl.FRAGMENT_SHADER,fragSrc));gl.linkProgram(program);const uniforms={};const count=gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);for(let i=0;i<count;i++){const{name}=gl.getActiveUniform(program,i);uniforms[name]=gl.getUniformLocation(program,name);}return{program,uniforms,bind(){gl.useProgram(this.program);}};}const baseVertexShader=`
            precision highp float;
            attribute vec2 aPosition;
            varying vec2 vUv, vL, vR, vT, vB;
            uniform vec2 texelSize;
            void main () {
                vUv = aPosition * 0.5 + 0.5;
                vL = vUv - vec2(texelSize.x, 0.0);
                vR = vUv + vec2(texelSize.x, 0.0);
                vT = vUv + vec2(0.0, texelSize.y);
                vB = vUv - vec2(0.0, texelSize.y);
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }`;const simpleVertexShader=`
            precision highp float;
            attribute vec2 aPosition;
            varying vec2 vUv;
            uniform vec2 texelSize;
            void main () {
                vUv = aPosition * 0.5 + 0.5;
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }`;const clearShader=`
            precision mediump float;
            varying vec2 vUv;
            uniform sampler2D uTexture;
            uniform float value;
            void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`;const colorShader=`
            precision mediump float;
            uniform vec4 color;
            void main () { gl_FragColor = color; }`;const displayShaderSource=`
            precision highp float;
            varying vec2 vUv, vL, vR, vT, vB;
            uniform sampler2D uTexture, uBloom, uSunrays, uDithering;
            uniform vec2 ditherScale, texelSize;
            vec3 linearToGamma (vec3 color) {
                color = max(color, vec3(0));
                return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
            }
            void main () {
                vec3 c = texture2D(uTexture, vUv).rgb;
            #ifdef SHADING
                vec3 lc = texture2D(uTexture, vL).rgb;
                vec3 rc = texture2D(uTexture, vR).rgb;
                vec3 tc = texture2D(uTexture, vT).rgb;
                vec3 bc = texture2D(uTexture, vB).rgb;
                float dx = length(rc) - length(lc);
                float dy = length(tc) - length(bc);
                vec3 n = normalize(vec3(dx, dy, length(texelSize)));
                float diffuse = clamp(dot(n, vec3(0.0, 0.0, 1.0)) + 0.7, 0.7, 1.0);
                c *= diffuse;
            #endif
            #ifdef BLOOM
                vec3 bloom = texture2D(uBloom, vUv).rgb;
            #endif
            #ifdef SUNRAYS
                float sunrays = texture2D(uSunrays, vUv).r;
                c *= sunrays;
            #ifdef BLOOM
                bloom *= sunrays;
            #endif
            #endif
            #ifdef BLOOM
                float noise = texture2D(uDithering, vUv * ditherScale).r;
                noise = noise * 2.0 - 1.0;
                bloom += noise / 255.0;
                bloom = linearToGamma(bloom);
                c += bloom;
            #endif
                float a = max(c.r, max(c.g, c.b));
                gl_FragColor = vec4(c, a);
            }`;const bloomPrefilterShader=`
            precision mediump float;
            varying vec2 vUv;
            uniform sampler2D uTexture;
            uniform vec3 curve;
            uniform float threshold;
            void main () {
                vec3 c = texture2D(uTexture, vUv).rgb;
                float br = max(c.r, max(c.g, c.b));
                float rq = clamp(br - curve.x, 0.0, curve.y);
                rq = curve.z * rq * rq;
                c *= max(rq, br - threshold) / max(br, 0.0001);
                gl_FragColor = vec4(c, 0.0);
            }`;const bloomBlurShader=`
            precision mediump float;
            varying vec2 vUv, vL, vR, vT, vB;
            uniform sampler2D uTexture;
            void main () {
                vec4 sum = vec4(0.0);
                sum += texture2D(uTexture, vL);
                sum += texture2D(uTexture, vR);
                sum += texture2D(uTexture, vT);
                sum += texture2D(uTexture, vB);
                gl_FragColor = sum * 0.25;
            }`;const bloomFinalShader=`
            precision mediump float;
            varying vec2 vUv, vL, vR, vT, vB;
            uniform sampler2D uTexture;
            uniform float intensity;
            void main () {
                vec4 sum = vec4(0.0);
                sum += texture2D(uTexture, vL);
                sum += texture2D(uTexture, vR);
                sum += texture2D(uTexture, vT);
                sum += texture2D(uTexture, vB);
                gl_FragColor = sum * 0.25 * intensity;
            }`;const sunraysMaskShader=`
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uTexture;
            void main () {
                vec4 c = texture2D(uTexture, vUv);
                float br = max(c.r, max(c.g, c.b));
                c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
                gl_FragColor = c;
            }`;const sunraysShader=`
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uTexture;
            uniform float weight;
            #define ITERATIONS 16
            void main () {
                float Density = 0.3, Decay = 0.95, Exposure = 0.7;
                vec2 coord = vUv;
                vec2 dir = (vUv - 0.5) * (1.0 / float(ITERATIONS)) * Density;
                float illuminationDecay = 1.0;
                float color = texture2D(uTexture, vUv).a;
                for (int i = 0; i < ITERATIONS; i++) {
                    coord -= dir;
                    color += texture2D(uTexture, coord).a * illuminationDecay * weight;
                    illuminationDecay *= Decay;
                }
                gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
            }`;const splatShader=`
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uTarget;
            uniform float aspectRatio, radius;
            uniform vec3 color;
            uniform vec2 point;
            void main () {
                vec2 p = vUv - point.xy;
                p.x *= aspectRatio;
                vec3 splat = exp(-dot(p, p) / radius) * color;
                gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
            }`;const advectionShader=`
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uVelocity, uSource;
            uniform vec2 texelSize, dyeTexelSize;
            uniform float dt, dissipation;
            vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
                vec2 st = uv / tsize - 0.5;
                vec2 iuv = floor(st);
                vec2 fuv = fract(st);
                vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
                vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
                vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
                vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
                return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
            }
            void main () {
                vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
                gl_FragColor = bilerp(uSource, coord, dyeTexelSize) / (1.0 + dissipation * dt);
            }`;const divergenceShader=`
            precision mediump float;
            varying vec2 vUv, vL, vR, vT, vB;
            uniform sampler2D uVelocity;
            void main () {
                float L = texture2D(uVelocity, vL).x;
                float R = texture2D(uVelocity, vR).x;
                float T = texture2D(uVelocity, vT).y;
                float B = texture2D(uVelocity, vB).y;
                vec2 C = texture2D(uVelocity, vUv).xy;
                if (vL.x < 0.0) L = -C.x;
                if (vR.x > 1.0) R = -C.x;
                if (vT.y > 1.0) T = -C.y;
                if (vB.y < 0.0) B = -C.y;
                gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
            }`;const curlShader=`
            precision mediump float;
            varying vec2 vUv, vL, vR, vT, vB;
            uniform sampler2D uVelocity;
            void main () {
                float L = texture2D(uVelocity, vL).y;
                float R = texture2D(uVelocity, vR).y;
                float T = texture2D(uVelocity, vT).x;
                float B = texture2D(uVelocity, vB).x;
                gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
            }`;const vorticityShader=`
            precision highp float;
            varying vec2 vUv, vL, vR, vT, vB;
            uniform sampler2D uVelocity, uCurl;
            uniform float curl, dt;
            void main () {
                float L = texture2D(uCurl, vL).x;
                float R = texture2D(uCurl, vR).x;
                float T = texture2D(uCurl, vT).x;
                float B = texture2D(uCurl, vB).x;
                float C = texture2D(uCurl, vUv).x;
                vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
                force = force / (length(force) + 0.0001) * curl * C;
                force.y *= -1.0;
                vec2 velocity = texture2D(uVelocity, vUv).xy + force * dt;
                gl_FragColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);
            }`;const pressureShader=`
            precision mediump float;
            varying vec2 vUv, vL, vR, vT, vB;
            uniform sampler2D uPressure, uDivergence;
            void main () {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                float divergence = texture2D(uDivergence, vUv).x;
                gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
            }`;const gradientSubtractShader=`
            precision mediump float;
            varying vec2 vUv, vL, vR, vT, vB;
            uniform sampler2D uPressure, uVelocity;
            void main () {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                vec2 velocity = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
                gl_FragColor = vec4(velocity, 0.0, 1.0);
            }`;function createDisplayProgram(keywords){const src=keywords.map(k=>`#define ${k}
`).join("")+displayShaderSource;return createProgram(baseVertexShader,src);}const displayKeywords=[];if(SHADING)displayKeywords.push("SHADING");if(BLOOM)displayKeywords.push("BLOOM");if(SUNRAYS)displayKeywords.push("SUNRAYS");const programs={clear:createProgram(simpleVertexShader,clearShader),color:createProgram(simpleVertexShader,colorShader),display:createDisplayProgram(displayKeywords),bloomPrefilter:createProgram(simpleVertexShader,bloomPrefilterShader),bloomBlur:createProgram(baseVertexShader,bloomBlurShader),bloomFinal:createProgram(baseVertexShader,bloomFinalShader),sunraysMask:createProgram(simpleVertexShader,sunraysMaskShader),sunrays:createProgram(simpleVertexShader,sunraysShader),splat:createProgram(simpleVertexShader,splatShader),advection:createProgram(simpleVertexShader,advectionShader),divergence:createProgram(baseVertexShader,divergenceShader),curl:createProgram(baseVertexShader,curlShader),vorticity:createProgram(baseVertexShader,vorticityShader),pressure:createProgram(baseVertexShader,pressureShader),gradientSubtract:createProgram(baseVertexShader,gradientSubtractShader)};// ── Geometry ────────────────────────────────────────────────────
gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,-1,1,1,1,1,-1]),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3]),gl.STATIC_DRAW);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(0);function blit(target){if(target==null){gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);gl.bindFramebuffer(gl.FRAMEBUFFER,null);}else{gl.viewport(0,0,target.width,target.height);gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);}gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);}// ── FBOs ────────────────────────────────────────────────────────
function createFBO(w,h,internalFormat,format,type,param){gl.activeTexture(gl.TEXTURE0);const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,param);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,param);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,internalFormat,w,h,0,format,type,null);const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT);return{texture,fbo,width:w,height:h,texelSizeX:1/w,texelSizeY:1/h,attach(id){gl.activeTexture(gl.TEXTURE0+id);gl.bindTexture(gl.TEXTURE_2D,texture);return id;}};}function createDoubleFBO(w,h,internalFormat,format,type,param){let fbo1=createFBO(w,h,internalFormat,format,type,param);let fbo2=createFBO(w,h,internalFormat,format,type,param);return{width:w,height:h,texelSizeX:fbo1.texelSizeX,texelSizeY:fbo1.texelSizeY,get read(){return fbo1;},set read(v){fbo1=v;},get write(){return fbo2;},set write(v){fbo2=v;},swap(){[fbo1,fbo2]=[fbo2,fbo1];}};}// ── Dithering texture ───────────────────────────────────────────
const ditheringTexture=(()=>{const bayer=[0,48,12,60,3,51,15,63,32,16,44,28,35,19,47,31,8,56,4,52,11,59,7,55,40,24,36,20,43,27,39,23,2,50,14,62,1,49,13,61,34,18,46,30,33,17,45,29,10,58,6,54,9,57,5,53,42,26,38,22,41,25,37,21];const data=new Uint8Array(64*3);for(let i=0;i<64;i++){const v1=Math.floor(bayer[i]/64*255);data[i*3]=data[i*3+1]=data[i*3+2]=v1;}const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,8,8,0,gl.RGB,gl.UNSIGNED_BYTE,data);return{texture,width:8,height:8,attach(id){gl.activeTexture(gl.TEXTURE0+id);gl.bindTexture(gl.TEXTURE_2D,texture);return id;}};})();// ── Resolution ──────────────────────────────────────────────────
canvas.width=canvas.offsetWidth||800;canvas.height=canvas.offsetHeight||600;function getResolution(resolution){let ar=gl.drawingBufferWidth/gl.drawingBufferHeight;if(ar<1)ar=1/ar;const min=Math.round(resolution);const max=Math.round(resolution*ar);return gl.drawingBufferWidth>gl.drawingBufferHeight?{width:max,height:min}:{width:min,height:max};}const simRes=getResolution(SIM_RESOLUTION);const dyeRes=getResolution(DYE_RESOLUTION);const bloomRes=getResolution(BLOOM_RESOLUTION);const sunRes=getResolution(SUNRAYS_RESOLUTION);const{formatRGBA,formatRG,formatR,halfFloatTexType}=ext;let dye=createDoubleFBO(dyeRes.width,dyeRes.height,formatRGBA.internalFormat,formatRGBA.format,halfFloatTexType,linearFiltering);let velocity=createDoubleFBO(simRes.width,simRes.height,formatRG.internalFormat,formatRG.format,halfFloatTexType,linearFiltering);let divergence=createFBO(simRes.width,simRes.height,formatR.internalFormat,formatR.format,halfFloatTexType,gl.NEAREST);let curl=createFBO(simRes.width,simRes.height,formatR.internalFormat,formatR.format,halfFloatTexType,gl.NEAREST);let pressure=createDoubleFBO(simRes.width,simRes.height,formatR.internalFormat,formatR.format,halfFloatTexType,gl.NEAREST);const bloomFramebuffers=[];for(let i=0;i<BLOOM_ITERATIONS;i++){const w=bloomRes.width>>i;const h=bloomRes.height>>i;if(w<2||h<2)break;bloomFramebuffers.push(createFBO(w,h,formatRGBA.internalFormat,formatRGBA.format,halfFloatTexType,linearFiltering));}const bloomOutput=createFBO(bloomRes.width,bloomRes.height,formatRGBA.internalFormat,formatRGBA.format,halfFloatTexType,linearFiltering);const sunraysTemp=createFBO(sunRes.width,sunRes.height,formatR.internalFormat,formatR.format,halfFloatTexType,linearFiltering);const sunrays=createFBO(sunRes.width,sunRes.height,formatR.internalFormat,formatR.format,halfFloatTexType,linearFiltering);// ── Color helpers ───────────────────────────────────────────────
function HSVtoRGB(h,s,v1){const i=Math.floor(h*6),f=h*6-i;const p=v1*(1-s),q=v1*(1-f*s),t=v1*(1-(1-f)*s);switch(i%6){case 0:return{r:v1,g:t,b:p};case 1:return{r:q,g:v1,b:p};case 2:return{r:p,g:v1,b:t};case 3:return{r:p,g:q,b:v1};case 4:return{r:t,g:p,b:v1};default:return{r:v1,g:p,b:q};}}let currentFluidColor=generateColor();let inactivityTimer=null;const INACTIVITY_DELAY=2e3;// ── Keyboard color navigation ───────────────────────────────────
// colorNavIdx is the mutable mirror of the React colorNavIndex state.
// React state drives the toast UI; the mutable var drives the WebGL splats.
let colorNavIdx=0;function getNavColor(idx){if(validBrandColors.length>0){const len=validBrandColors.length;const i=(idx%len+len)%len;const{r,g,b}=validBrandColors[i];const intensity=Math.max(.01,Math.min(1,BRAND_COLOR_INTENSITY));return{r:r*intensity,g:g*intensity,b:b*intensity};}// 12 named hue steps — matches NAMED_COLORS order in React state
const i=(idx%12+12)%12;const c=HSVtoRGB(i/12,1,1);return{r:c.r*.15,g:c.g*.15,b:c.b*.15};}function applyNavColor(idx){const base=getNavColor(idx);// Instantly flood the canvas with the new color
currentFluidColor=base;if(pointers[0])pointers[0].color=base;const boost=14;for(let i=0;i<12;i++){splat(Math.random(),Math.random(),1e3*(Math.random()-.5),1e3*(Math.random()-.5),{r:base.r*boost,g:base.g*boost,b:base.b*boost});}}function showToast(){clearTimeout(toastTimerRef.current);setToastVisible(true);toastTimerRef.current=setTimeout(()=>setToastVisible(false),1800);}function stepNavBackward(){colorNavIdx-=1;setColorNavIndex(colorNavIdx);applyNavColor(colorNavIdx);showToast();}function stepNavForward(){colorNavIdx+=1;setColorNavIndex(colorNavIdx);applyNavColor(colorNavIdx);showToast();}// ── Autoplay ────────────────────────────────────────────────────
// Fires random splats on an interval when the user is idle,
// keeping the canvas alive without any interaction.
let autoplayTimer=null;function scheduleAutoplay(){if(!AUTOPLAY)return;clearInterval(autoplayTimer);autoplayTimer=setInterval(()=>{if(PAUSED||keyPaused)return;const count=Math.max(1,Math.round(AUTOPLAY_COUNT));for(let i=0;i<count;i++){const color=generateColor();color.r*=10;color.g*=10;color.b*=10;splat(Math.random(),Math.random(),800*(Math.random()-.5),800*(Math.random()-.5),color);}},Math.max(.5,AUTOPLAY_INTERVAL)*1e3);}// ── Pointers ────────────────────────────────────────────────────
const pointers=[{id:-1,texcoordX:0,texcoordY:0,prevTexcoordX:0,prevTexcoordY:0,deltaX:0,deltaY:0,down:false,moved:false,color:currentFluidColor}];function correctRadius(r){const ar=canvas.width/canvas.height;return ar>1?r*ar:r;}// ── Splat ───────────────────────────────────────────────────────
function splatPointer(pointer){splat(pointer.texcoordX,pointer.texcoordY,pointer.deltaX*SPLAT_FORCE,pointer.deltaY*SPLAT_FORCE,pointer.color);}function splat(x,y,dx,dy,color){const p=programs.splat;p.bind();gl.uniform1i(p.uniforms.uTarget,velocity.read.attach(0));gl.uniform1f(p.uniforms.aspectRatio,canvas.width/canvas.height);gl.uniform2f(p.uniforms.point,x,y);gl.uniform3f(p.uniforms.color,dx,dy,0);gl.uniform1f(p.uniforms.radius,correctRadius(SPLAT_RADIUS/100));blit(velocity.write);velocity.swap();gl.uniform1i(p.uniforms.uTarget,dye.read.attach(0));gl.uniform3f(p.uniforms.color,color.r,color.g,color.b);blit(dye.write);dye.swap();}function multipleSplats(amount){for(let i=0;i<amount;i++){const color=generateColor();color.r*=10;color.g*=10;color.b*=10;splat(Math.random(),Math.random(),1e3*(Math.random()-.5),1e3*(Math.random()-.5),color);}}multipleSplats(Math.floor(Math.random()*10)+5);// ── Keyboard shortcuts ─ (keyPaused declared here so autoplay can read it)
let keyPaused=PAUSED;// Start autoplay after initial splats
scheduleAutoplay();// ── Simulation step ─────────────────────────────────────────────
function step(dt){gl.disable(gl.BLEND);programs.curl.bind();gl.uniform2f(programs.curl.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);gl.uniform1i(programs.curl.uniforms.uVelocity,velocity.read.attach(0));blit(curl);programs.vorticity.bind();gl.uniform2f(programs.vorticity.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);gl.uniform1i(programs.vorticity.uniforms.uVelocity,velocity.read.attach(0));gl.uniform1i(programs.vorticity.uniforms.uCurl,curl.attach(1));gl.uniform1f(programs.vorticity.uniforms.curl,CURL);gl.uniform1f(programs.vorticity.uniforms.dt,dt);blit(velocity.write);velocity.swap();programs.divergence.bind();gl.uniform2f(programs.divergence.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);gl.uniform1i(programs.divergence.uniforms.uVelocity,velocity.read.attach(0));blit(divergence);programs.clear.bind();gl.uniform1i(programs.clear.uniforms.uTexture,pressure.read.attach(0));gl.uniform1f(programs.clear.uniforms.value,PRESSURE);blit(pressure.write);pressure.swap();programs.pressure.bind();gl.uniform2f(programs.pressure.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);gl.uniform1i(programs.pressure.uniforms.uDivergence,divergence.attach(0));for(let i=0;i<PRESSURE_ITERATIONS;i++){gl.uniform1i(programs.pressure.uniforms.uPressure,pressure.read.attach(1));blit(pressure.write);pressure.swap();}programs.gradientSubtract.bind();gl.uniform2f(programs.gradientSubtract.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);gl.uniform1i(programs.gradientSubtract.uniforms.uPressure,pressure.read.attach(0));gl.uniform1i(programs.gradientSubtract.uniforms.uVelocity,velocity.read.attach(1));blit(velocity.write);velocity.swap();programs.advection.bind();gl.uniform2f(programs.advection.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);gl.uniform2f(programs.advection.uniforms.dyeTexelSize,velocity.texelSizeX,velocity.texelSizeY);gl.uniform1i(programs.advection.uniforms.uVelocity,velocity.read.attach(0));gl.uniform1i(programs.advection.uniforms.uSource,velocity.read.attach(0));gl.uniform1f(programs.advection.uniforms.dt,dt);gl.uniform1f(programs.advection.uniforms.dissipation,VELOCITY_DISSIPATION);blit(velocity.write);velocity.swap();gl.uniform2f(programs.advection.uniforms.dyeTexelSize,dye.texelSizeX,dye.texelSizeY);gl.uniform1i(programs.advection.uniforms.uVelocity,velocity.read.attach(0));gl.uniform1i(programs.advection.uniforms.uSource,dye.read.attach(1));gl.uniform1f(programs.advection.uniforms.dissipation,DENSITY_DISSIPATION);blit(dye.write);dye.swap();}// ── Bloom ───────────────────────────────────────────────────────
function applyBloom(source){if(bloomFramebuffers.length<2)return;gl.disable(gl.BLEND);const knee=BLOOM_THRESHOLD*BLOOM_SOFT_KNEE+1e-4;programs.bloomPrefilter.bind();gl.uniform3f(programs.bloomPrefilter.uniforms.curve,BLOOM_THRESHOLD-knee,knee*2,.25/knee);gl.uniform1f(programs.bloomPrefilter.uniforms.threshold,BLOOM_THRESHOLD);gl.uniform1i(programs.bloomPrefilter.uniforms.uTexture,source.attach(0));blit(bloomFramebuffers[0]);programs.bloomBlur.bind();let last=bloomFramebuffers[0];for(let i=1;i<bloomFramebuffers.length;i++){gl.uniform2f(programs.bloomBlur.uniforms.texelSize,last.texelSizeX,last.texelSizeY);gl.uniform1i(programs.bloomBlur.uniforms.uTexture,last.attach(0));blit(bloomFramebuffers[i]);last=bloomFramebuffers[i];}gl.blendFunc(gl.ONE,gl.ONE);gl.enable(gl.BLEND);for(let i=bloomFramebuffers.length-2;i>=0;i--){gl.uniform2f(programs.bloomBlur.uniforms.texelSize,last.texelSizeX,last.texelSizeY);gl.uniform1i(programs.bloomBlur.uniforms.uTexture,last.attach(0));gl.viewport(0,0,bloomFramebuffers[i].width,bloomFramebuffers[i].height);gl.bindFramebuffer(gl.FRAMEBUFFER,bloomFramebuffers[i].fbo);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);last=bloomFramebuffers[i];}gl.disable(gl.BLEND);programs.bloomFinal.bind();gl.uniform2f(programs.bloomFinal.uniforms.texelSize,last.texelSizeX,last.texelSizeY);gl.uniform1i(programs.bloomFinal.uniforms.uTexture,last.attach(0));gl.uniform1f(programs.bloomFinal.uniforms.intensity,BLOOM_INTENSITY);blit(bloomOutput);}// ── Sunrays ─────────────────────────────────────────────────────
function applySunrays(source,mask,destination){gl.disable(gl.BLEND);programs.sunraysMask.bind();gl.uniform1i(programs.sunraysMask.uniforms.uTexture,source.attach(0));blit(mask);programs.sunrays.bind();gl.uniform1f(programs.sunrays.uniforms.weight,SUNRAYS_WEIGHT);gl.uniform1i(programs.sunrays.uniforms.uTexture,mask.attach(0));blit(destination);blur(destination,mask,1);}function blur(target,temp,iterations){programs.bloomBlur.bind();for(let i=0;i<iterations;i++){gl.uniform2f(programs.bloomBlur.uniforms.texelSize,1/target.width,1/target.height);gl.uniform1i(programs.bloomBlur.uniforms.uTexture,target.attach(0));blit(temp);gl.uniform2f(programs.bloomBlur.uniforms.texelSize,1/temp.width,1/temp.height);gl.uniform1i(programs.bloomBlur.uniforms.uTexture,temp.attach(0));blit(target);}}// ── Render ──────────────────────────────────────────────────────
function render(target){if(BLOOM)applyBloom(dye.read);if(SUNRAYS)applySunrays(dye.read,sunraysTemp,sunrays);if(TRANSPARENT){gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.BLEND);}else{gl.disable(gl.BLEND);// Use the shared parser so rgba() from Framer's color picker works
const bg=parseColorToRGB(BACK_COLOR)??{r:0,g:0,b:0};programs.color.bind();gl.uniform4f(programs.color.uniforms.color,bg.r,bg.g,bg.b,1);blit(target);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.BLEND);}const prog=programs.display;prog.bind();gl.uniform2f(prog.uniforms.texelSize,1/gl.drawingBufferWidth,1/gl.drawingBufferHeight);gl.uniform1i(prog.uniforms.uTexture,dye.read.attach(0));if(BLOOM){gl.uniform1i(prog.uniforms.uBloom,bloomOutput.attach(1));gl.uniform1i(prog.uniforms.uDithering,ditheringTexture.attach(2));gl.uniform2f(prog.uniforms.ditherScale,gl.drawingBufferWidth/ditheringTexture.width,gl.drawingBufferHeight/ditheringTexture.height);}if(SUNRAYS)gl.uniform1i(prog.uniforms.uSunrays,sunrays.attach(3));blit(target);}// ── Input ───────────────────────────────────────────────────────
let colorUpdateTimer=0;function updatePointerDownData(pointer,id,posX,posY){pointer.id=id;pointer.down=true;pointer.moved=false;pointer.texcoordX=posX/canvas.width;pointer.texcoordY=1-posY/canvas.height;pointer.prevTexcoordX=pointer.texcoordX;pointer.prevTexcoordY=pointer.texcoordY;pointer.deltaX=0;pointer.deltaY=0;pointer.color=generateColor();}function updatePointerMoveData(pointer,posX,posY){pointer.prevTexcoordX=pointer.texcoordX;pointer.prevTexcoordY=pointer.texcoordY;pointer.texcoordX=posX/canvas.width;pointer.texcoordY=1-posY/canvas.height;const ar=canvas.width/canvas.height;pointer.deltaX=(pointer.texcoordX-pointer.prevTexcoordX)*(ar<1?ar:1);pointer.deltaY=(pointer.texcoordY-pointer.prevTexcoordY)/(ar>1?ar:1);pointer.moved=Math.abs(pointer.deltaX)>0||Math.abs(pointer.deltaY)>0;}function updatePointerUpData(pointer){pointer.down=false;}function onMouseDown(e){const rect=canvas.getBoundingClientRect();updatePointerDownData(pointers[0],-1,e.clientX-rect.left,e.clientY-rect.top);}function onMouseMove(e){const rect=canvas.getBoundingClientRect();const pointer=pointers[0];if(!COLORFUL)pointer.color=currentFluidColor;updatePointerMoveData(pointer,e.clientX-rect.left,e.clientY-rect.top);clearTimeout(inactivityTimer);inactivityTimer=setTimeout(()=>{currentFluidColor=generateColor();pointer.color=currentFluidColor;},INACTIVITY_DELAY);}function onMouseUp(){updatePointerUpData(pointers[0]);}function onTouchStart(e){e.preventDefault();const rect=canvas.getBoundingClientRect();while(pointers.length<e.targetTouches.length)pointers.push({id:-1,texcoordX:0,texcoordY:0,prevTexcoordX:0,prevTexcoordY:0,deltaX:0,deltaY:0,down:false,moved:false,color:generateColor()});for(let i=0;i<e.targetTouches.length;i++)updatePointerDownData(pointers[i],e.targetTouches[i].identifier,e.targetTouches[i].clientX-rect.left,e.targetTouches[i].clientY-rect.top);}function onTouchMove(e){e.preventDefault();const rect=canvas.getBoundingClientRect();for(let i=0;i<e.targetTouches.length;i++){if(!pointers[i])continue;updatePointerMoveData(pointers[i],e.targetTouches[i].clientX-rect.left,e.targetTouches[i].clientY-rect.top);}}function onTouchEnd(e){for(let i=0;i<e.changedTouches.length;i++){const pointer=pointers.find(p=>p.id===e.changedTouches[i].identifier);if(pointer)updatePointerUpData(pointer);}}// ── Keyboard shortcuts ──────────────────────────────────────────
// keyPaused declared above near multipleSplats
function onKeyDown(e){const tag=document.activeElement?.tagName;if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT")return;// P — toggle pause
if(e.code==="KeyP"){e.preventDefault();keyPaused=!keyPaused;}// K — toggle autoplay
if(AUTOPLAY&&e.code==="KeyK"){e.preventDefault();if(autoplayTimer){clearInterval(autoplayTimer);autoplayTimer=null;}else{scheduleAutoplay();}}// Space — burst of splats
if(e.code==="Space"){e.preventDefault();const count=Math.floor(Math.random()*8)+8;for(let i=0;i<count;i++){const color=generateColor();color.r*=12;color.g*=12;color.b*=12;splat(Math.random(),Math.random(),1200*(Math.random()-.5),1200*(Math.random()-.5),color);}}// < — step to previous color / hue
// ArrowLeft — step to previous color
if(KEYBOARD_COLOR_NAV&&e.code==="ArrowLeft"){e.preventDefault();stepNavBackward();}// ArrowRight — step to next color
if(KEYBOARD_COLOR_NAV&&e.code==="ArrowRight"){e.preventDefault();stepNavForward();}}window.addEventListener("mousedown",onMouseDown);window.addEventListener("mousemove",onMouseMove);window.addEventListener("mouseup",onMouseUp);window.addEventListener("touchstart",onTouchStart,{passive:false});window.addEventListener("touchmove",onTouchMove,{passive:false});window.addEventListener("touchend",onTouchEnd);window.addEventListener("keydown",onKeyDown);window.addEventListener("mouseleave",()=>{currentFluidColor=generateColor();pointers[0].color=currentFluidColor;});canvas.style.pointerEvents="none";// ── Main loop ───────────────────────────────────────────────────
let lastUpdateTime=Date.now();let animId;function update(){const dt=calcDeltaTime();if(!PAUSED&&!keyPaused){updateColors(dt);applyInputs();step(dt);}render(null);animId=requestAnimationFrame(update);}function calcDeltaTime(){const now=Date.now();let dt=Math.min((now-lastUpdateTime)/1e3,.016666);lastUpdateTime=now;return dt;}function updateColors(dt){if(!COLORFUL)return;colorUpdateTimer+=dt*COLOR_UPDATE_SPEED;if(colorUpdateTimer>=1){colorUpdateTimer%=1;pointers.forEach(p=>{p.color=generateColor();});}}function applyInputs(){pointers.forEach(p=>{if(p.moved){p.moved=false;splatPointer(p);}});}update();// ── Resize ──────────────────────────────────────────────────────
const resizeCanvas=()=>{const dpr=window.devicePixelRatio||1;canvas.width=canvas.offsetWidth*dpr;canvas.height=canvas.offsetHeight*dpr;canvas.style.width=canvas.offsetWidth+"px";canvas.style.height=canvas.offsetHeight+"px";};resizeCanvas();const resizeObserver=new ResizeObserver(resizeCanvas);resizeObserver.observe(canvas.parentElement);// ── Cleanup ─────────────────────────────────────────────────────
return()=>{cancelAnimationFrame(animId);clearTimeout(inactivityTimer);clearTimeout(toastTimerRef.current);clearInterval(autoplayTimer);resizeObserver.disconnect();gl.getExtension("WEBGL_lose_context")?.loseContext();window.removeEventListener("mousedown",onMouseDown);window.removeEventListener("mousemove",onMouseMove);window.removeEventListener("mouseup",onMouseUp);window.removeEventListener("touchstart",onTouchStart);window.removeEventListener("touchmove",onTouchMove);window.removeEventListener("touchend",onTouchEnd);window.removeEventListener("keydown",onKeyDown);};},[SIM_RESOLUTION,DYE_RESOLUTION,DENSITY_DISSIPATION,VELOCITY_DISSIPATION,PRESSURE,PRESSURE_ITERATIONS,CURL,SPLAT_RADIUS,SPLAT_FORCE,SHADING,COLORFUL,COLOR_UPDATE_SPEED,PAUSED,TRANSPARENT,BLOOM,BLOOM_ITERATIONS,BLOOM_RESOLUTION,BLOOM_INTENSITY,BLOOM_THRESHOLD,BLOOM_SOFT_KNEE,SUNRAYS,SUNRAYS_RESOLUTION,SUNRAYS_WEIGHT,BACK_COLOR,USE_BRAND_COLORS,JSON.stringify(BRAND_COLORS),BRAND_COLOR_INTENSITY,AUTOPLAY,AUTOPLAY_INTERVAL,AUTOPLAY_COUNT,KEYBOARD_COLOR_NAV]);// ── Toast label computation ─────────────────────────────────────────────
const brandLen=USE_BRAND_COLORS&&Array.isArray(BRAND_COLORS)?Math.max(1,BRAND_COLORS.length):1;const safeIdx=(colorNavIndex%(USE_BRAND_COLORS?brandLen:12)+(USE_BRAND_COLORS?brandLen:12))%(USE_BRAND_COLORS?brandLen:12);const toastLabel=USE_BRAND_COLORS?`Color ${safeIdx+1}`:NAMED_COLORS[safeIdx].name;const toastDotColor=USE_BRAND_COLORS?null:`rgb(${Math.round(NAMED_COLORS[safeIdx].r*255)},${Math.round(NAMED_COLORS[safeIdx].g*255)},${Math.round(NAMED_COLORS[safeIdx].b*255)})`;return /*#__PURE__*/_jsxs("div",{style:{width:"100%",height:"100%",overflow:"hidden",position:"relative",background:TRANSPARENT?"transparent":BACK_COLOR},children:[/*#__PURE__*/_jsx("canvas",{ref:canvasRef,style:{width:"100%",height:"100%",display:"block"}}),KEYBOARD_COLOR_NAV&&/*#__PURE__*/_jsxs("div",{style:{position:"absolute",bottom:20,left:"50%",transform:`translateX(-50%) translateY(${toastVisible?"0":"10px"})`,opacity:toastVisible?1:0,transition:"opacity 0.2s ease, transform 0.2s ease",pointerEvents:"none",display:"flex",alignItems:"center",gap:8,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:24,padding:"6px 14px 6px 10px",border:"1px solid rgba(255,255,255,0.12)"},children:[toastDotColor&&/*#__PURE__*/_jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:toastDotColor,boxShadow:`0 0 8px 2px ${toastDotColor}`,flexShrink:0}}),/*#__PURE__*/_jsx("span",{style:{fontSize:13,fontFamily:"sans-serif",fontWeight:500,color:"rgba(255,255,255,0.92)",letterSpacing:"0.05em",whiteSpace:"nowrap"},children:toastLabel}),/*#__PURE__*/_jsx("span",{style:{fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"sans-serif",letterSpacing:"0.04em"},children:"← →"})]})]});}// ── Property Controls ────────────────────────────────────────────────────────
addPropertyControls(LiquidFluid,{// ── Brand Colors ────────────────────────────────────────────────────────
USE_BRAND_COLORS:{type:ControlType.Boolean,title:"Brand Colors",defaultValue:false,description:"Use your own palette instead of random colors."},BRAND_COLORS:{type:ControlType.Array,title:"Colors",control:{type:ControlType.Color},defaultValue:["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7"],maxCount:8,hidden:props=>!props.USE_BRAND_COLORS,description:"Up to 8 brand colors cycled in order."},BRAND_COLOR_INTENSITY:{type:ControlType.Number,title:"Intensity",min:.05,max:.5,step:.01,defaultValue:.15,hidden:props=>!props.USE_BRAND_COLORS,description:"Brightness of the fluid color."},// ── Autoplay ────────────────────────────────────────────────────────────
AUTOPLAY:{type:ControlType.Boolean,title:"Autoplay",defaultValue:true,description:"Fires splats on idle to keep the canvas alive. Press K on the live site to toggle on/off."},AUTOPLAY_INTERVAL:{type:ControlType.Number,title:"Autoplay Interval",min:.5,max:10,step:.5,defaultValue:3,hidden:props=>!props.AUTOPLAY,description:"Seconds between each autoplay burst."},AUTOPLAY_COUNT:{type:ControlType.Number,title:"Autoplay Splats",min:1,max:20,step:1,defaultValue:5,hidden:props=>!props.AUTOPLAY,description:"Number of splats per autoplay burst."},// ── Keyboard shortcuts ──────────────────────────────────────────────────
KEYBOARD_COLOR_NAV:{type:ControlType.Boolean,title:"Keyboard Colors",defaultValue:true,description:"Arrow Left / Right keys cycle through colors. A toast shows the color name."},// ── Simulation ──────────────────────────────────────────────────────────
SIM_RESOLUTION:{type:ControlType.Enum,title:"Sim Resolution",options:[32,64,128,256],optionTitles:["32 — Low","64 — Medium","128 — High","256 — Ultra"],defaultValue:128,description:"Physics simulation quality. Higher = smoother but heavier on GPU."},DYE_RESOLUTION:{type:ControlType.Enum,title:"Dye Resolution",options:[256,512,1024,2048],optionTitles:["256 — Low","512 — Medium","1024 — High","2048 — Ultra"],defaultValue:1024,description:"Visual fluid quality."},DENSITY_DISSIPATION:{type:ControlType.Number,title:"Color Fade",min:0,max:4,step:.01,defaultValue:1.6,description:"How quickly fluid color fades out."},VELOCITY_DISSIPATION:{type:ControlType.Number,title:"Motion Fade",min:0,max:4,step:.01,defaultValue:1.47,description:"How quickly fluid motion slows."},PRESSURE:{type:ControlType.Number,title:"Pressure",min:0,max:1,step:.01,defaultValue:.42,description:"Fluid compression strength."},PRESSURE_ITERATIONS:{type:ControlType.Number,title:"Pressure Quality",min:1,max:60,step:1,defaultValue:10,description:"More iterations = more accurate pressure, lower performance."},CURL:{type:ControlType.Number,title:"Curl / Swirl",min:0,max:50,step:1,defaultValue:11,description:"Vorticity — how much the fluid spins and swirls."},SPLAT_RADIUS:{type:ControlType.Number,title:"Brush Size",min:.01,max:1,step:.01,defaultValue:.11,description:"Size of the fluid brush on mouse / touch."},SPLAT_FORCE:{type:ControlType.Number,title:"Brush Force",min:0,max:12e3,step:100,defaultValue:6e3,description:"How hard the fluid is pushed by the cursor."},// ── Visual ──────────────────────────────────────────────────────────────
BACK_COLOR:{type:ControlType.Color,title:"Background",defaultValue:"#000000",description:"Background color (used when Transparent BG is off)."},TRANSPARENT:{type:ControlType.Boolean,title:"Transparent BG",defaultValue:false,description:"Render over a transparent background."},SHADING:{type:ControlType.Boolean,title:"Shading",defaultValue:true,description:"3D lighting effect on the fluid surface."},COLORFUL:{type:ControlType.Boolean,title:"Colorful Mode",defaultValue:false,description:"Auto-cycle through random colors over time."},COLOR_UPDATE_SPEED:{type:ControlType.Number,title:"Color Speed",min:1,max:30,step:1,defaultValue:10,hidden:props=>!props.COLORFUL,description:"How fast colors cycle in Colorful Mode."},PAUSED:{type:ControlType.Boolean,title:"Start Paused",defaultValue:false,description:"Start paused. Press P on the live site to toggle."},// ── Bloom ───────────────────────────────────────────────────────────────
BLOOM:{type:ControlType.Boolean,title:"Bloom",defaultValue:true,description:"Cinematic glow around bright fluid areas."},BLOOM_INTENSITY:{type:ControlType.Number,title:"Bloom Intensity",min:.1,max:2,step:.01,defaultValue:.47,hidden:props=>!props.BLOOM,description:"Glow strength."},BLOOM_THRESHOLD:{type:ControlType.Number,title:"Bloom Threshold",min:0,max:1,step:.01,defaultValue:.22,hidden:props=>!props.BLOOM,description:"Brightness level needed to trigger bloom."},BLOOM_SOFT_KNEE:{type:ControlType.Number,title:"Bloom Softness",min:0,max:1,step:.01,defaultValue:.7,hidden:props=>!props.BLOOM,description:"Smoothness of the bloom transition."},BLOOM_ITERATIONS:{type:ControlType.Number,title:"Bloom Size",min:1,max:12,step:1,defaultValue:8,hidden:props=>!props.BLOOM,description:"More iterations = wider, softer glow."},BLOOM_RESOLUTION:{type:ControlType.Enum,title:"Bloom Resolution",options:[64,128,256,512],optionTitles:["64","128","256","512"],defaultValue:256,hidden:props=>!props.BLOOM,description:"Internal resolution for bloom processing."},// ── Sunrays ─────────────────────────────────────────────────────────────
SUNRAYS:{type:ControlType.Boolean,title:"Sunrays",defaultValue:true,description:"Volumetric light beams from bright areas."},SUNRAYS_WEIGHT:{type:ControlType.Number,title:"Sunrays Intensity",min:.3,max:1,step:.01,defaultValue:.5,hidden:props=>!props.SUNRAYS,description:"Strength of the sunray effect."},SUNRAYS_RESOLUTION:{type:ControlType.Enum,title:"Sunrays Resolution",options:[64,128,196,256],optionTitles:["64","128","196","256"],defaultValue:196,hidden:props=>!props.SUNRAYS,description:"Internal resolution for sunray rendering."},credits:{type:ControlType.Boolean,defaultValue:false,title:"Show Credits",description:"[Explore more components](https://dub.sh/explore-new)\n\n[Made by Sillyweb](https://dub.sh/Made-by-sillyweb)"}});
export const __FramerMetadata__ = {"exports":{"default":{"type":"reactComponent","name":"LiquidFluid","slots":[],"annotations":{"framerIntrinsicHeight":"200","framerIntrinsicWidth":"200","framerDisableUnlink":"*","framerContractVersion":"1"}},"__FramerMetadata__":{"type":"variable"}}}
//# sourceMappingURL=./Liquid_Fluid.map
# Análisis de GBJS

GBJS es un emulador de Game Boy DMG escrito en JavaScript sin dependencias, pensado para el navegador. El juego de instrucciones está en buen estado: pasa la suite funcional de Blargg y el test de ciclos por instrucción. No es ciclo a ciclo. La PPU dibuja la línea entera al final del modo 3, el timer no comparte reloj con DIV, el APU no tiene secuenciador de frames y varios MBC se rechazan o se implementan a medias. En esta máquina el coste de emular un frame cabe de sobra en los 16,7 ms de un frame real; el ritmo lo marca `setInterval`, no `requestAnimationFrame`.

Este documento no cambia el emulador. Añade un arnés de Node que descarga las ROMs fuera del repositorio y las ejecuta.

## Cómo se midió

Entorno: Node.js 22.23.4. El núcleo importa `document` al cargar `src/CPU.js` y construye un `AudioContext` y un canvas en los constructores, así que el arnés instala sustitutos mínimos antes del `import`. No se modificó ningún archivo de `src/`.

El arnés completa al momento una transferencia serie con reloj interno (escritura en `FF02` con los bits 7 y 0). Sin eso, Blargg se queda esperando a que baje el bit 7 de SC: en el navegador, hoy, ese bit no baja nunca. Los passes de CPU son reales (comparan registros y memoria); el texto «Passed» solo sale porque el arnés cierra el enlace. Si el LCD está apagado, `emulateFrame()` no vuelve: el arnés corta el frame a los 70224 T-cycles para poder seguir. Ese corte no existe en el emulador.

Criterios:

| Suite | Señal de éxito |
| --- | --- |
| Blargg | Texto `Passed` por serie o en el mapa de fondo (`9800`–`9FFF`). `Failed` gana si aparecen los dos. |
| Mooneye | Protocolo oficial: B/C/D/E/H/L = 3, 5, 8, 13, 21, 34 y luego `LD B,B`. Fallo: los seis registros a `0x42`. |
| dmg-acid2 | Índices de color 0–3 frente a `reference-dmg.png` (gris de 2 bits). La paleta del emulador es `00/77/CC/FF`, no `00/55/AA/FF`, así que se compara el índice, no el RGB. |
| cgb-acid2 | RGB exacto frente a `reference.png`. |

ROMs, solo en la máquina de análisis:

- [retrio/gb-test-roms](https://github.com/retrio/gb-test-roms) (Blargg).
- [Mooneye Test Suite](https://gekkio.fi/files/mooneye-test-suite/), build `mts-20260714-0944-31510e1` (75 acceptance y los MBC pequeños; se dejaron fuera los ROM de más de 256 KiB).
- [dmg-acid2 v1.0](https://github.com/mattcurrie/dmg-acid2/releases/download/v1.0/dmg-acid2.gb) y [cgb-acid2 v1.1](https://github.com/mattcurrie/cgb-acid2/releases/download/v1.1/cgb-acid2.gbc), con los PNG de referencia de cada repo.

No se ejecutaron `oam_bug` ni `cgb_sound`. Por el código (no hay bug de OAM ni APU de CGB) saldrían en fallo.

## Resumen de resultados

| Grupo | ROMs | Pasa | Falla | Otro |
| --- | ---: | ---: | ---: | --- |
| Blargg `cpu_instrs` (suite + 11 individuales) | 12 | 12 | 0 | |
| Blargg `instr_timing` | 1 | 1 | 0 | |
| Blargg `mem_timing` | 4 | 0 | 4 | |
| Blargg `halt_bug` | 1 | 0 | 1 | |
| Blargg `dmg_sound` (extra, audio) | 13 | 0 | 5 | 8 tiempo agotado |
| Blargg `mem_timing-2` e `interrupt_time` (extra) | 5 | 0 | 4 | 1 tiempo agotado |
| Mooneye acceptance | 75 | 10 | 65 | |
| Mooneye MBC pequeño | 10 | 2 | 4 | 4 MBC2 rechazado |
| dmg-acid2 | 1 | 0 | 1 | 98,84 % de píxeles; el fallo publicado de sprites 8×16 coincide al 99,95 % |
| cgb-acid2 | 1 | 0 | 1 | 66,4 % RGB; el cartucho es CGB-only (`0xC0`) y se pinta en gris DMG |

El veredicto de cada ROM está en el apéndice. Los 10 acceptance que pasan: `bits/mem_oam`, `bits/reg_f`, `boot_regs-dmgABC`, `halt_ime0_ei`, `halt_ime1_timing`, `instr/daa`, `oam_dma/basic`, `timer/tim00_div_trigger`, `timer/tim01`, `timer/tim11_div_trigger`.

`boot_regs-dmgABC` pasa: el alta manual `AF=01B0 BC=0013 DE=00D8 HL=014D SP=FFFE` coincide con un DMG A/B/C. `boot_hwio-dmgABCmgb` y `boot_div-dmgABCmgb` fallan: el estado de I/O y de DIV después del boot no.

## Arquitectura

Módulos ES nativos, sin `package.json`, sin empaquetador y sin CI. Se sirve el directorio (`python3 -m http.server`) y el navegador carga `index.html` → `src/GameBoy.js`. Abrir el archivo por `file://` no funciona. Licencia MIT, copyright 2025 Ángel Cruz Reyes. Unas 7900 líneas en `src/` y unas 4700 en `debug/`, que ya no arrancan (ver deuda).

```
src/GameBoy.js       UI, ajustes, setInterval
src/CPU.js           registros, fetch/decode, IME, frame
src/OpcodeTable.js   ~245 opcodes + 256 del prefijo CB
src/Instruction.js   implementación
src/GPU.js           PPU por líneas, OAM, VRAM, DMA
src/MMU.js           bus, MBC1/MBC5, I/O
src/Timer.js         DIV/TIMA
src/Joypad.js        teclado y botones en pantalla
src/APU/             Web Audio, CH1–CH3 activos, CH4 sin instanciar
```

`GameBoy` crea una `CPU`. La CPU crea MMU, timer, PPU, joypad y APU, y la tabla de opcodes. `init()` pone el estado post-boot DMG y enciende la LCD (`LCDC=0x91`). La ROM llega después, por `FileReader`, y el tipo de cartucho sale de `0x147`.

El frame es síncrono y lo dispara `setInterval` cada `1000 / (4194304 / 70224)` ms (16,74 ms, 59,73 fps). Dentro:

```
mientras no haya vblank:
  ciclos = instrucción completa, o 4 si está en HALT
  timer.updateTimers(ciclos)
  vblank = ppu.updateGraphics(ciclos)
  apu.updateAudio(ciclos)
  comprobar interrupciones
  aplicar el retraso de EI
```

Eso es temporización por instrucción, no por T-cycle. Cada subsistema lleva su propio contador. No hay un reloj de 16 bits compartido, ni FIFO de píxeles, ni muestras de audio generadas por ese reloj. Los 20 T-cycles de atender una interrupción se suman a `#cycleCounter`, que nadie lee: timer, PPU y APU no los ven.

El primer `emulateFrame()` sale al entrar en la línea 144, así que dura 144 líneas (65664 ciclos). Los siguientes incluyen el vblank anterior y vuelven a durar 70224. El intervalo no distingue esos dos casos.

`src/CPU.js` lee el DOM al importarse (elementos de un depurador que no está en `index.html`). La PPU exige `#screen` y un contexto 2D. El joypad registra listeners al construirse. El APU hace `new AudioContext()` aunque el juego aún no haya sonado. Por eso un test de Node necesita el shim y por eso el núcleo no se puede importar en un script sin navegador.

## Precisión

### CPU

La tabla de T-cycles por opcode es la correcta a nivel de instrucción completa: `instr_timing` pasa, y `cpu_instrs` pasa los 11 apartados (especiales, interrupciones, SP/HL, inmediatos, pares, cargas, saltos/llamadas, miscelánea, ALU, bits y `(HL)`). DAA pasa también el test de Mooneye. Los flags de F se enmascaran a `0xF0`. El retraso de `EI` (IME sube después de la instrucción siguiente) está bien planteado.

Lo que no está:

- `HALT` solo pone `isHalted`. No existe el halt bug (IME a 0 e `IF & IE` distinto de 0: la siguiente instrucción se ejecuta dos veces). `halt_bug.gb` pinta `Failed`. Con IME a 0 y la interrupción ya pendiente, la CPU se queda en HALT hasta un flanco nuevo de `requestInterrupt`, porque nadie vuelve a mirar IF.
- `DI` no cancela un `EI` pendiente. `EI` / `DI` acaba con IME a 1 (`ei_sequence` y `rapid_di_ei` fallan).
- `STOP` está vacío. La longitud en la tabla es 2, así que se salta el byte siguiente, pero no hay estado stopped ni despertar con un botón.
- Los 20 ciclos de la interrupción no avanzan el resto de la máquina (`interrupt_time` se queda en un bucle; `intr_timing` y los `call_timing` / `jp_timing` / `ret_timing` de Mooneye fallan).
- Once opcodes ilegales (`D3 DB DD E3 E4 EB EC ED F4 FC FD`) no están en la tabla. El fetch lanza y ese frame muere; el `setInterval` reintenta el mismo PC.
- `getRegister` / `setRegister` hacen `toUpperCase`, `Object.keys` e `indexOf` en cada acceso. Funciona (los tests pasan) y es el punto caliente evitable.

`mem_timing` y `mem_timing-2` fallan los tres apartados (lectura, escritura, lectura-modificación-escritura). La pantalla del test marca, entre otros, `LDH A,(a8)`, `LD (HL),n`, `LD (a16),A`, `DEC (HL)` / `INC (HL)` y los `CB` sobre `(HL)`. El total de ciclos de la instrucción es el bueno; el acceso a memoria ocurre entero al principio, no en el M-cycle que le toca. Un reloj por T-cycle es el cambio que abre esa puerta. No hace falta para que un juego comercial «se vea», y sí para que la afirmación de ciclo a ciclo del README sea cierta.

### PPU

Modos fijos: 2 = 80, 3 = 172, 0 = 204 (456 por línea). Líneas 144–153 de vblank. La suma da 70224 y el vblank pide la IRQ 0. No hay FIFO, ni modo 3 variable por sprites o SCX, ni penalización de SCX. La línea se rasteriza en JavaScript al salir del modo 3 y se sube el `ImageData` entero (160×144×4) en cada una de las 144 líneas.

dmg-acid2, que el propio test describe como válido para un render por líneas, queda así:

- 98,84 % de los índices coinciden con la referencia (267 píxeles de 23040).
- 99,95 % coincide con la imagen de fallo publicada `8x16-obj-tile-index-bit-0` (12 píxeles de diferencia, alrededor de x=104, y=68–71).
- El resto de la cara cuadra: límite de 10 sprites («HELLO WORLD!»), ojo derecho por ventana, tiles con signo, pelo con el fondo apagado en esas filas. Las imágenes de fallo de prioridad, de mapa y de ventana se parecen menos que la del sprite 8×16.

La causa está en `#renderSprites`: en modo 8×16 se usa el índice de tile tal cual. En hardware el bit 0 se ignora. El resto de bugs de sprites no los dispara esta ROM, pero siguen en el código:

- La Y y la X del sprite se enmascaran con `& 0xFF` después de restar 16 y 8. Un sprite que debería asomar por arriba o por la izquierda (Y menor que 16, X menor que 8) se va a la coordenada 240 y no se dibuja.
- La prioridad OBJ-sobre-BG compara el rojo del framebuffer con 255 o 155, no el índice de color 0 del fondo. Con la paleta verde, o con BGP que no mapea el color 0 a blanco, falla. No hay buffer de índices.
- Si el fondo está apagado (LCDC bit 0) no se rellena la línea con el color 0 de BGP; queda el frame anterior. En acid2 esa franja del pelo acertó porque el framebuffer ya era ese gris.
- Los sprites se dibujan en orden de OAM y el último pisa al primero. En DMG gana la X menor y, a igual X, el índice OAM menor.
- Escribir `FF44` pone LY a 0. En hardware LY es de solo lectura. El `init()` escribe `0x91` ahí y, por este camino, LY acaba en 0. El `#line` interno también arranca en 0, así que el accidente coincide con un LY inicial de 0, no con el 0x91 que el código creía poner.
- `writeByte` de la PPU discrimina con `addr & 0xF`. Cualquier I/O `FF4x`–`FF7x` acabado en 4 se trata como LY, y acabado en 6 dispara DMA. `FF46` no se guarda: el registro lee 0 después de la transferencia. `oam_dma/basic` pasa (los 160 bytes llegan); `oam_dma/reg_read` falla.
- La DMA es instantánea. Durante esos 160 µs la CPU real solo puede tocar HRAM. No hay bloqueo de VRAM/OAM en los modos 2 y 3.
- STAT: el bit de coincidencia se actualiza al cambiar LY, y la IRQ de LYC sale en ese momento si el bit 6 ya estaba. No se recomprueba al escribir LYC. No hay bloqueo de STAT (varias fuentes en el mismo ciclo). Escribir STAT puede pisar los bits de modo. Todos los acceptance de PPU de Mooneye fallan (`stat_irq_blocking`, `stat_lyc_onoff`, `vblank_stat_intr`, los `intr_2_*`, `hblank_ly_scx_timing`, `lcdon_timing`).
- Con la LCD apagada, `updateGraphics` pone modo 0, LY 0 y vuelve `undefined`. `emulateFrame` no sale del `while`. Un juego que apague la LCD y espere a que LY avance se queda con la pestaña congelada. Si la vuelve a encender, el frame sigue y el navegador no pinta hasta el próximo vblank.

cgb-acid2 lleva el flag CGB-only `0xC0`. Se ejecuta igual, con A de DMG (`0x01`) y paleta gris. El 66,4 % de RGB es solape de blancos y negros de la silueta, no soporte de color. No hay bancos de VRAM, atributos de tile, paletas CGB ni doble velocidad. Los ojos salen como trazos porque el volteo de fondo es de CGB.

### Timer

Las cuatro frecuencias de TAC están bien en ciclos (`1024 / 16 / 64 / 256` T-cycles) y un `while` permite varios incrementos de TIMA en una instrucción larga. Eso basta para `instr_timing` y para `timer/tim01` y `timer/tim11_div_trigger`.

DIV es otro contador. Sube cuando el acumulador pasa de `0xFF` (255, no 256) y el resto se tira (`#dividerCounter = 0`), así que se adelanta y pierde fase. Escribir `FF04` pone el registro a 0 y no toca el acumulador. TIMA no mira el flanco de bajada del bit de DIV que corresponde al TAC: al cambiar TAC o al resetear DIV no se produce el incremento espurio, y la fase de TIMA no está atada a DIV. El desbordamiento recarga TMA y pide la IRQ en el mismo paso; en hardware TIMA lee 0 durante 4 T-cycles y la IRQ llega un tick después.

Por eso fallan `div_write`, `rapid_toggle`, `tima_reload`, `tima_write_reloading`, `tma_write_reloading`, `tim00`, `tim10`, `tim11` y los `*_div_trigger` salvo los dos que pasaron. `div_timing` y `boot_div-*` también fallan: sin boot ROM, DIV no tiene el valor que deja el arranque.

### Interrupciones, HALT, DMA, serie

Las cinco IRQ existen y se atienden por prioridad si IME está a 1. `requestInterrupt` despierta HALT aunque IME sea 0, que es lo correcto para el caso en que la IRQ llega durante el HALT. `halt_ime0_ei` y `halt_ime1_timing` pasan. El servicio hace `push` del PC y salta a `40/48/50/58/60`, con IME a 0. IF se baja escribiendo el array a mano, sin pasar por el handler de I/O.

No hay puerto serie. `FF01` y `FF02` son bytes normales. Un juego de intercambio, y cualquier test que espere el fin de la transferencia, se bloquea. El arnés lo tapa; el navegador no.

### MBC y memoria

| Tipo (`0x147`) | Comportamiento |
| --- | --- |
| `0x00` ROM | Carga. |
| `0x01`–`0x03` MBC1 | Carga. Banco bajo de 5 bits bien (`bits_bank1` pasa). |
| `0x19`–`0x1E` MBC5 | Carga. `rom_512kb` pasa. El bit de rumble no se separa del banco de RAM. |
| `0x05`–`0x06` MBC2 | Rechazado. Los cuatro tests pequeños acaban en «Unsupported MBC». |
| `0x0F`–`0x13` MBC3 | Rechazado. No hay RTC. Pokémon y similares ni arrancan. |
| Resto | Rechazado. |

MBC1, en `0x4000`–`0x5FFF`, toma los bits 5–6 del valor escrito en vez de desplazar los bits 0–1. El modo 1 (bit 0 de `0x6000`) pone el banco de RAM a 0 en lugar de aplicar el latch como banco de RAM y limpiar los bits altos de ROM. `bits_bank2`, `bits_mode`, `bits_ramg` y `ram_64kb` fallan.

La RAM externa se escribe solo si el enable vale `0x0A`, pero se lee siempre. Con la RAM apagada el hardware devuelve `0xFF`. Un tamaño de RAM 0 deja el array vacío y la lectura devuelve `undefined`.

`FEA0`–`FEFF` no tiene rama: leer esa zona devuelve IE (`FFFF`) y escribirla pisa IE. `unused_hwio-GS` falla. La echo RAM `E000`–`FDFF` sí espeja `C000`–`DDFF` mediante `addr & 0x1FFF`.

No hay boot ROM. El comentario de `inbios` está muerto. Escribir `FF50` cae en el `default` de la PPU y se guarda como un I/O más; no desmapea nada.

### Boot y registros de I/O

`init()` intenta el estado post-boot DMG, pero varias escrituras no hacen lo que el autor quería:

- `FF10`–`FF25` se escriben con el audio aún apagado, y `APU.writeByte` las ignora. Luego `FF26=0xF1` guarda solo el bit 7 (`0x80`), no `0xF1`.
- `FF44=0x91` acaba en LY=0 por el handler de la PPU.
- `FF46=0xFF` lanza una DMA desde `FF00` durante el init y no deja `0xFF` en el registro.

Los registros de CPU sí cuadran con DMG A/B/C. Los de hardware no.

## Rendimiento

Presupuesto de un frame: 70224 T-cycles, 16,74 ms. Medido en Node, con `putImageData` vacío (no hay subida a GPU), 180 frames tras un calentamiento de 20. El bucle es un `JR -2` en una ROM de 32 KiB, o dmg-acid2.

| Caso | ms/frame | fps equivalentes | `putImageData` / frame | ¿Cabe en 16,74 ms? |
| --- | ---: | ---: | ---: | --- |
| `JR` con LCD encendida (fondo vacío) | 0,78 | ~1290 | 144 | sí |
| `JR` con LCD apagada (CPU y timer) | 0,31 | ~3230 | 0 | sí |
| dmg-acid2 (fondo, ventana, sprites) | 1,33 | ~750 | 144 | sí |

En esta máquina el JavaScript va unas 12 veces por encima del tiempo real incluso con el raster de acid2, y eso ya incluye `Object.keys` en cada acceso a registro. El hueco hasta 16,7 ms es grande en un escritorio. No se midió un móvil.

Lo que el número no incluye, y es lo que puede comerse el margen:

- 144 llamadas a `putImageData` del buffer completo por frame. Son unos 13 MB de copia por frame (~780 MB/s a 59,7 fps), hechos además desde el hilo que emula.
- El `setInterval` no está anclado al vertical del monitor, no descuenta el tiempo ya gastado y no acumula retraso para recuperar. A 1× se pide un frame cada 16,74 ms; si el callback tarda 5 ms, el periodo real depende del temporizador del navegador, que se retrasa y, en segundo plano, se congela (aquí, además, `visibilitychange` pausa a propósito).
- Cada píxel hace varias llamadas a `readByte` y arma el color en el momento. No hay tile cache ni buffer de índices.
- Un frame con la LCD apagada no vuelve: no es un problema de fps, es un bloqueo del hilo.

Conclusión: el emulador puede sostener 59,7 fps de cómputo en un PC. No está demostrado que la presentación lo haga, y el diseño (intervalo fijo + blit por línea + posible cuelgue con la LCD apagada) es lo que hay que cambiar antes de optimizar registros.

## Audio

Tres canales suenan. CH4 está escrito y comentado en `APU.js` (no se construye, no está en el mezclador ni en la casilla de ajustes). Blargg `dmg_sound`: 0 de 13. `01-registers` falla en el apartado 2 («NR10–NR51 and wave RAM write/read»). Ocho tests se quedan en un bucle que lee `FF26` (NR52) con `AND (HL)`: esperan un bit de canal que no llega a ponerse o no llega a borrarse.

Modelo actual: cada canal es un `AudioBufferSource` en bucle (8 muestras el cuadrado, 32 la wave) con `playbackRate` para la frecuencia y `GainNode` para volumen, paneo y envolvente. El secuenciador de frames (512 Hz, pasos 0–7, reloj sacado de DIV) no existe. Longitud, envolvente y sweep llevan contadores propios a 256 Hz, 64 Hz y 128 Hz. Las cifras de periodo se parecen; la fase, el alineado con DIV y los efectos de borde no.

Problemas concretos:

- Al disparar un canal se enciende su bit en NR52 y `stop()` no lo apaga. El juego que espera a que el bit caiga no sigue.
- Apagar el APU (`NR52` bit 7) no pone a cero `NR10`–`NR51`. `#handleAudioPowerOnOff` evalúa `this.#isAudioOn` sin llamarlo: la función siempre es verdadera, así que la condición no mira el estado anterior.
- El sweep de CH1 reescribe NR13/NR14 con `mmu.writeByte`. Si el bit 7 de NR14 sigue a 1, eso redispara el canal. El periodo nuevo sale de un cociente en coma flotante, no de un desplazamiento entero.
- La longitud cuenta hacia arriba desde el valor del registro hasta 64 (o 256 en la wave). La cuenta de ticks coincide con `(64 - N)`, pero solo corre mientras el canal está «triggered», no en el paso del secuenciador, y encender el bit de longitud a destiempo no tiene el extra clock.
- La envolvente mueve un gain analógico de 1/15. No hay volumen digital de 4 bits, ni zombie mode, ni el periodo que se recarga en el tick.
- La wave se captura una vez al disparar. Escribir la wave RAM con el canal en marcha no se oye, y la lectura corrupta de la wave RAM no existe. `09`, `10` y `12` fallan.
- El paneo se aplica al disparar. Cambiar NR51 después no llama a `updatePanning` (está comentado).
- CH4, si se activara, tiene `return this.LFSR & (1 == 0) ? 1 : -1`, que por precedencia es siempre `-1`. El LFSR en `update` está comentado.
- No hay filtro paso alto de los condensadores de salida ni mezcla con la resolución del DAC. VIN se ignora.
- La altura la marca el `AudioContext` en tiempo real. Envolvente, longitud y sweep avanzan solo cuando el emulador corre ciclos. Si `setInterval` se atrasa, la melodía se alarga y el tono no. A 2× el tempo se dobla y el tono se queda. La latencia es la del contexto (a menudo 20–100 ms) más un buffer diminuto; no hay cola de muestras alineada al frame. Pausar llama a `suspend()`, que corta en seco.

## Interfaz y entrada

La UI está en español (`lang="es"`), con nes.css y la fuente Press Start 2P desde CDN. Sin red, el estilo y la fuente no cargan. El canvas usa `image-rendering: pixelated`, así que el escalado CSS no se emborrona. El ancho es el 50 % del contenedor. El selector de tamaño 1×/2× está comentado en `index.html`; el README lo describe como activo. El código que lo rellenaría tolera que el `<select>` no exista.

Controles por defecto en código y en el formulario: A=`J`, B=`K`, Select=`Shift`, Start=`Enter`, direcciones WASD. El README invierte A y B. No hay `preventDefault` en el juego, así que Enter y las flechas (si se reasignan) mueven la página o el botón con foco. No hay Gamepad API. La pantalla táctil tiene `touch-action: none` y trata touch y ratón; está bien encaminada para el móvil. El layout se reordena con dos `matchMedia` (retrato, y paisaje por debajo de 1024×540).

Al ocultar la pestaña se pausa y se reanuda solo. El menú guarda tema, volumen, canales, velocidad y teclas en `localStorage`. Las teclas usan las claves `"0"`…`"7"`, que pueden chocar con cualquier otro uso de esas claves.

La velocidad (0,5×, 1×, 1,5×, 2×) divide el periodo del intervalo. No cambia el número de ciclos por frame. El audio, como arriba, no sigue el tono.

## Guardados

No hay persistencia de la RAM de cartucho, ni de la RTC, ni save states. El nombre de clase CSS `load-state` es el estado del botón «Load game», no un estado de partida. Al salir se hace `new CPU()` y se pierde la RAM. Los cartuchos con batería (MBC1 tipo 3, MBC5 `0x1B`/`0x1E`) tienen el array de RAM en memoria y nada más. MBC3 ni siquiera carga, así que la RTC no tiene dónde vivir.

Lo que sí se guarda es la configuración de la UI.

## CGB

El README lo dice y el código lo cumple: no hay modo doble, bancos de VRAM (`FF4F`) ni de WRAM (`FF70`), paletas `FF68`–`FF6B`, HDMA ni DMA general. Un `.gbc` entra si el MBC es 0, 1 o 5 y corre como DMG, con A=`0x01`. Un juego CGB-only que mire el registro A o `KEY0` se niega a arrancar o se ve mal. cgb-acid2 es el caso medido.

No tiene sentido abrir el CGB encima del timer, la DMA y el MBC1 actuales: el modo compatible heredaría esos fallos. Va después.

## Deuda, tests y estilo

No hay tests automáticos ni workflow. `debug/` son scripts de navegador de cuando los miembros eran públicos. Después del commit que los hizo privados (`de793ea`) llaman a `doInterrupts`, `getClockFreq`, `writeTAC`, `cpu.if` y `cpu.instructionTable`, que ya no existen. `Disassembler` lee `cpu.instructionTable`, que es `#instructionTable`. No hay HTML que monte esos scripts. Hoy no verifican nada.

El estilo del núcleo es coherente: clases, campos privados, JSDoc, puntos y coma, módulos con extensión `.js`. Comentarios en inglés y alguno en español. No hay ESLint, Prettier ni tipos. El bucle de frame y el init conviven con restos del depurador paso a paso comentados. `OpcodeTable.js` son 3346 líneas de literales muy parecidos; es mecánico y, a la vista de `cpu_instrs`, correcto en ciclos y en el dispatch.

La licencia MIT permite el arnés y este documento. Las ROMs de test no se añaden: Blargg y Mooneye tienen sus propias licencias y acid2 también. El script las baja a `tools/rom-test/cache/`, ignorado por git.

## Mejoras, por PR

Cada fila es un PR corto, de un tema. Impacto es el efecto sobre juegos y sobre los tests de arriba. Esfuerzo es el tamaño del cambio, no un calendario.

| PR | Tema | Impacto | Esfuerzo | Archivos |
| --- | --- | --- | --- | --- |
| 1 | Que `emulateFrame` vuelva con la LCD apagada, y pasar el presentador a `requestAnimationFrame` con acumulador de tiempo | Alto | Bajo | `src/CPU.js`, `src/GPU.js`, `src/GameBoy.js` |
| 2 | PPU DMG: ignorar el bit 0 del tile 8×16, buffer de índices de color, prioridad real, sprites en el borde, LY de solo lectura, un solo `putImageData` por frame | Alto | Medio | `src/GPU.js` |
| 3 | Un contador de 16 bits: DIV es el byte alto, TIMA sale de su flanco, escribir DIV lo pone a 0, recarga de TIMA con 4 T-cycles de retraso | Alto | Medio | `src/Timer.js`, `src/MMU.js` |
| 4 | APU: secuenciador a 512 Hz anclado a DIV, máscaras de registro, bits de NR52 al parar, no redisparar el sweep, activar CH4 | Alto | Alto | `src/APU/APU.js`, `CH1.js`, `CH2.js`, `CH3.js`, `CH4.js` |
| 5 | MBC1: bits altos del banco, modo ROM/RAM, lectura `0xFF` con la RAM apagada; no mapear `FEA0`–`FEFF` sobre IE | Alto | Medio | `src/MMU.js` |
| 6 | RAM con batería en IndexedDB, keyed por título y checksum del cartucho | Alto | Medio | `src/MMU.js`, `src/GameBoy.js`, módulo nuevo |
| 7 | MBC3 y RTC (latch, halt del reloj, persistir el epoch) | Alto | Medio | `src/MMU.js`, el módulo del PR 6 |
| 8 | Halt bug, `DI` cancela `EI`, y los 20 T-cycles de la IRQ pasan por timer, PPU y APU | Alto | Medio | `src/CPU.js`, `src/Instruction.js` |
| 9 | OAM DMA de 640 T-cycles, `FF46` legible, la CPU solo ve HRAM mientras dura | Medio | Medio | `src/GPU.js`, `src/MMU.js`, `src/CPU.js` |
| 10 | Puerto serie con reloj interno: 8 bits, bajar el bit 7 de SC, IRQ de serie | Medio | Bajo | `src/MMU.js` o `src/Serial.js`, `src/CPU.js` |
| 11 | Sacar el DOM y Web Audio del import del núcleo (CPU, PPU, joypad, APU reciben sus salidas). El arnés deja de necesitar el shim. Enganchar `node tools/rom-test/run.mjs` al CI | Medio | Medio | `src/CPU.js`, `src/GPU.js`, `src/Joypad.js`, `src/APU/APU.js`, `src/GameBoy.js` |
| 12 | Save states (CPU, I/O, RAM de cartucho, RTC, PPU) además de la SRAM | Medio | Medio | módulo nuevo, `src/GameBoy.js` |
| 13 | Registros por índice, sin `Object.keys` ni strings en el camino caliente | Medio | Medio | `src/CPU.js`, `src/Instruction.js` |
| 14 | Gamepad API, `preventDefault` de las teclas de juego, dejar el README igual que el formulario (A=`J`, B=`K`) y volver a mostrar el escalado entero | Medio | Bajo | `src/Joypad.js`, `src/GameBoy.js`, `index.html`, `README.md` |
| 15 | Boot ROM opcional (`FF50` desmapea) y, si no hay ROM, un post-boot de I/O que pase `boot_hwio-dmgABC` y `boot_div-dmgABC` | Medio | Medio | `src/CPU.js`, `src/MMU.js` |
| 16 | CGB, cuando los PR 2, 3, 5 y 9 estén: flag `0x143`, bancos VRAM/WRAM, paletas, doble velocidad, HDMA. No antes | Alto a largo plazo | Alto | `src/GPU.js`, `src/MMU.js`, `src/CPU.js` |
| 17 | Borrar o reescribir `debug/` y arreglar `Disassembler` (hoy lee un campo privado) | Bajo | Bajo | `debug/**`, `src/Disassembler.js` |

El orden es el de la tabla. Los PR 1, 2, 5 (la parte de MBC1) y 10 son pequeños y se pueden revisar solos. El 4 (APU) y el 16 (CGB) son los grandes; conviene no mezclarlos con otra cosa. El 11 facilita repetir esta tabla en CI, pero no hace falta para corregir el sprite 8×16 ni el cuelgue de la LCD.

### Las diez primeras, en una frase

1. **No congelar el hilo con la LCD apagada y presentar con `requestAnimationFrame`.** Hoy un juego que apaga la LCD y espera a LY deja la pestaña muerta, y el `setInterval` no sigue al monitor.
2. **Arreglar el sprite 8×16 (bit 0 del tile) y dejar de subir el framebuffer 144 veces.** Es la diferencia medida en dmg-acid2, y el blit es el coste de navegador que esta medición no incluye.
3. **Atar TIMA y DIV a un contador de 16 bits**, con el flanco, el reset y el retraso de recarga. Es la diferencia entre `instr_timing` (pasa) y `div_write` / `tima_reload` (fallan).
4. **Rehacer el APU alrededor del secuenciador de 512 Hz y encender CH4.** Cero tests de `dmg_sound`; NR52 no refleja los canales que suenan.
5. **Corregir MBC1 (bancos altos, modo, RAM apagada).** `bits_bank1` pasa y `bits_bank2`, `bits_mode`, `bits_ramg` y `ram_64kb` no.
6. **Guardar la SRAM con batería en IndexedDB.** Ahora salir o recargar borra la partida.
7. **Aceptar MBC3 y emular la RTC.** Esos cartuchos se rechazan al cargar. Sin esto no hay Pokémon ni otros juegos con reloj.
8. **Halt bug, cancelación de `EI` por `DI`, y que los ciclos de la IRQ muevan timer y PPU.** `halt_bug` falla y `ei_sequence` también.
9. **DMA de OAM con duración y con `FF46` legible.** La copia instantánea basta para `oam_dma/basic` y no para `reg_read` ni para los tests de timing.
10. **Implementar el serie en el emulador, no solo en el arnés.** Los `Passed` de Blargg de esta tabla no se pueden reproducir en el navegador: SC nunca termina la transferencia.

Quedan fuera de las diez, a propósito, el CGB y la micro-optimización de registros. El CGB es más catálogo que el siguiente fallo de DMG, y la medición de 0,8–1,3 ms/frame dice que los registros por string no son lo que impide llegar a 59,7.

## Repetir las medidas

Hace falta Node 22 (importa los `.js` del núcleo como ESM) y `unzip`.

```bash
node tools/rom-test/download.mjs
node tools/rom-test/run.mjs --bench
node tools/rom-test/run.mjs --only 'cpu_instrs|dmg-acid' --json /tmp/gb.json --shots /tmp/shots
```

`--no-extra` omite `dmg_sound`, `mem_timing-2` e `interrupt_time`. Las ROMs van a `tools/rom-test/cache/` y ese directorio no se versiona. El arnés sale con código 0 aunque haya fallos: es un informe, no una barrera de CI. Cuando el PR 11 separe el núcleo del DOM, el shim de `tools/rom-test/lib.mjs` se puede tirar y dejar la descarga y el criterio de pass/fail.

## Apéndice: veredicto de cada ROM

Misma ejecución que la tabla resumen. En Mooneye, «Pasa» es la secuencia de Fibonacci en B, C, D, E, H y L; «Falla» es `0x42` en esos seis registros.


### acid2

| ROM | Resultado | Nota |
| --- | --- | --- |
| `cgb-acid2.gbc` | Falla | 66,4 % RGB; cartucho CGB-only pintado en gris DMG |
| `dmg-acid2.gb` | Falla | 98,84 % índices; casi idéntico al fallo 8×16 bit 0 |

### blargg

| ROM | Resultado | Nota |
| --- | --- | --- |
| `cpu_instrs/cpu_instrs.gb` | Pasa | 01–11 ok |
| `cpu_instrs/individual/01-special.gb` | Pasa | Passed |
| `cpu_instrs/individual/02-interrupts.gb` | Pasa | Passed |
| `cpu_instrs/individual/03-op sp,hl.gb` | Pasa | Passed |
| `cpu_instrs/individual/04-op r,imm.gb` | Pasa | Passed |
| `cpu_instrs/individual/05-op rp.gb` | Pasa | Passed |
| `cpu_instrs/individual/06-ld r,r.gb` | Pasa | Passed |
| `cpu_instrs/individual/07-jr,jp,call,ret,rst.gb` | Pasa | Passed |
| `cpu_instrs/individual/08-misc instrs.gb` | Pasa | Passed |
| `cpu_instrs/individual/09-op r,r.gb` | Pasa | Passed |
| `cpu_instrs/individual/10-bit ops.gb` | Pasa | Passed |
| `cpu_instrs/individual/11-op a,(hl).gb` | Pasa | Passed |
| `halt_bug.gb` | Falla | Failed |
| `instr_timing/instr_timing.gb` | Pasa | Passed |
| `mem_timing/individual/01-read_timing.gb` | Falla | F0, FA y BIT/RL sobre (HL); el acceso no cae en el M-cycle esperado |
| `mem_timing/individual/02-write_timing.gb` | Falla | LD (HL),n, LDH (a8),A y LD (a16),A |
| `mem_timing/individual/03-modify_timing.gb` | Falla | INC/DEC (HL) y rotaciones CB sobre (HL) |
| `mem_timing/mem_timing.gb` | Falla | los tres apartados |

### blargg-audio

| ROM | Resultado | Nota |
| --- | --- | --- |
| `dmg_sound/dmg_sound.gb` | Tiempo agotado | bucle leyendo NR52 (FF26) |
| `dmg_sound/rom_singles/01-registers.gb` | Falla | Failed #2, máscaras NR10–NR51 y wave RAM |
| `dmg_sound/rom_singles/02-len ctr.gb` | Tiempo agotado | bucle leyendo NR52 (FF26) |
| `dmg_sound/rom_singles/03-trigger.gb` | Tiempo agotado | bucle leyendo NR52 (FF26) |
| `dmg_sound/rom_singles/04-sweep.gb` | Tiempo agotado | no termina dentro del presupuesto |
| `dmg_sound/rom_singles/05-sweep details.gb` | Tiempo agotado | no termina dentro del presupuesto |
| `dmg_sound/rom_singles/06-overflow on trigger.gb` | Falla | Failed |
| `dmg_sound/rom_singles/07-len sweep period sync.gb` | Tiempo agotado | bucle leyendo NR52 (FF26) |
| `dmg_sound/rom_singles/08-len ctr during power.gb` | Tiempo agotado | bucle leyendo NR52 (FF26) |
| `dmg_sound/rom_singles/09-wave read while on.gb` | Falla | Failed |
| `dmg_sound/rom_singles/10-wave trigger while on.gb` | Falla | Failed |
| `dmg_sound/rom_singles/11-regs after power.gb` | Tiempo agotado | bucle leyendo NR52 (FF26) |
| `dmg_sound/rom_singles/12-wave write while on.gb` | Falla | Failed |

### blargg-extra

| ROM | Resultado | Nota |
| --- | --- | --- |
| `interrupt_time/interrupt_time.gb` | Tiempo agotado | bucle leyendo NR52 (FF26) |
| `mem_timing-2/mem_timing.gb` | Falla | Run failed tests |
| `mem_timing-2/rom_singles/01-read_timing.gb` | Falla | Failed |
| `mem_timing-2/rom_singles/02-write_timing.gb` | Falla | Failed |
| `mem_timing-2/rom_singles/03-modify_timing.gb` | Falla | Failed |

### mooneye

| ROM | Resultado | Nota |
| --- | --- | --- |
| `acceptance/add_sp_e_timing.gb` | Falla | registros a 0x42 |
| `acceptance/bits/mem_oam.gb` | Pasa | Fibonacci |
| `acceptance/bits/reg_f.gb` | Pasa | Fibonacci |
| `acceptance/bits/unused_hwio-GS.gb` | Falla | registros a 0x42 |
| `acceptance/boot_div-dmg0.gb` | Falla | registros a 0x42 |
| `acceptance/boot_div-dmgABCmgb.gb` | Falla | registros a 0x42 |
| `acceptance/boot_div-S.gb` | Falla | registros a 0x42 |
| `acceptance/boot_div2-S.gb` | Falla | registros a 0x42 |
| `acceptance/boot_hwio-dmg0.gb` | Falla | registros a 0x42 |
| `acceptance/boot_hwio-dmgABCmgb.gb` | Falla | registros a 0x42 |
| `acceptance/boot_hwio-S.gb` | Falla | registros a 0x42 |
| `acceptance/boot_regs-dmg0.gb` | Falla | registros a 0x42 |
| `acceptance/boot_regs-dmgABC.gb` | Pasa | Fibonacci |
| `acceptance/boot_regs-mgb.gb` | Falla | registros a 0x42 |
| `acceptance/boot_regs-sgb.gb` | Falla | registros a 0x42 |
| `acceptance/boot_regs-sgb2.gb` | Falla | registros a 0x42 |
| `acceptance/call_cc_timing.gb` | Falla | registros a 0x42 |
| `acceptance/call_cc_timing2.gb` | Falla | registros a 0x42 |
| `acceptance/call_timing.gb` | Falla | registros a 0x42 |
| `acceptance/call_timing2.gb` | Falla | registros a 0x42 |
| `acceptance/di_timing-GS.gb` | Falla | registros a 0x42 |
| `acceptance/div_timing.gb` | Falla | registros a 0x42 |
| `acceptance/ei_sequence.gb` | Falla | registros a 0x42 |
| `acceptance/ei_timing.gb` | Falla | registros a 0x42 |
| `acceptance/halt_ime0_ei.gb` | Pasa | Fibonacci |
| `acceptance/halt_ime0_nointr_timing.gb` | Falla | registros a 0x42 |
| `acceptance/halt_ime1_timing.gb` | Pasa | Fibonacci |
| `acceptance/halt_ime1_timing2-GS.gb` | Falla | registros a 0x42 |
| `acceptance/if_ie_registers.gb` | Falla | registros a 0x42 |
| `acceptance/instr/daa.gb` | Pasa | Fibonacci |
| `acceptance/interrupts/ie_push.gb` | Falla | registros a 0x42 |
| `acceptance/intr_timing.gb` | Falla | registros a 0x42 |
| `acceptance/jp_cc_timing.gb` | Falla | registros a 0x42 |
| `acceptance/jp_timing.gb` | Falla | registros a 0x42 |
| `acceptance/ld_hl_sp_e_timing.gb` | Falla | registros a 0x42 |
| `acceptance/oam_dma_restart.gb` | Falla | registros a 0x42 |
| `acceptance/oam_dma_start.gb` | Falla | registros a 0x42 |
| `acceptance/oam_dma_timing.gb` | Falla | registros a 0x42 |
| `acceptance/oam_dma/basic.gb` | Pasa | Fibonacci |
| `acceptance/oam_dma/reg_read.gb` | Falla | registros a 0x42 |
| `acceptance/oam_dma/sources-GS.gb` | Falla | registros a 0x42 |
| `acceptance/pop_timing.gb` | Falla | registros a 0x42 |
| `acceptance/ppu/hblank_ly_scx_timing-GS.gb` | Falla | registros a 0x42 |
| `acceptance/ppu/intr_1_2_timing-GS.gb` | Falla | registros a 0x42 |
| `acceptance/ppu/intr_2_0_timing.gb` | Falla | registros a 0x42 |
| `acceptance/ppu/intr_2_mode0_timing_sprites.gb` | Falla | registros a 0x42 |
| `acceptance/ppu/intr_2_mode0_timing.gb` | Falla | registros a 0x42 |
| `acceptance/ppu/intr_2_mode3_timing.gb` | Falla | registros a 0x42 |
| `acceptance/ppu/intr_2_oam_ok_timing.gb` | Falla | registros a 0x42 |
| `acceptance/ppu/lcdon_timing-GS.gb` | Falla | registros a 0x42 |
| `acceptance/ppu/lcdon_write_timing-GS.gb` | Falla | registros a 0x42 |
| `acceptance/ppu/stat_irq_blocking.gb` | Falla | registros a 0x42 |
| `acceptance/ppu/stat_lyc_onoff.gb` | Falla | registros a 0x42 |
| `acceptance/ppu/vblank_stat_intr-GS.gb` | Falla | registros a 0x42 |
| `acceptance/push_timing.gb` | Falla | registros a 0x42 |
| `acceptance/rapid_di_ei.gb` | Falla | registros a 0x42 |
| `acceptance/ret_cc_timing.gb` | Falla | registros a 0x42 |
| `acceptance/ret_timing.gb` | Falla | registros a 0x42 |
| `acceptance/reti_intr_timing.gb` | Falla | registros a 0x42 |
| `acceptance/reti_timing.gb` | Falla | registros a 0x42 |
| `acceptance/rst_timing.gb` | Falla | registros a 0x42 |
| `acceptance/serial/boot_sclk_align-dmgABCmgb.gb` | Falla | registros a 0x42 |
| `acceptance/timer/div_write.gb` | Falla | registros a 0x42 |
| `acceptance/timer/rapid_toggle.gb` | Falla | registros a 0x42 |
| `acceptance/timer/tim00_div_trigger.gb` | Pasa | Fibonacci |
| `acceptance/timer/tim00.gb` | Falla | registros a 0x42 |
| `acceptance/timer/tim01_div_trigger.gb` | Falla | registros a 0x42 |
| `acceptance/timer/tim01.gb` | Pasa | Fibonacci |
| `acceptance/timer/tim10_div_trigger.gb` | Falla | registros a 0x42 |
| `acceptance/timer/tim10.gb` | Falla | registros a 0x42 |
| `acceptance/timer/tim11_div_trigger.gb` | Pasa | Fibonacci |
| `acceptance/timer/tim11.gb` | Falla | registros a 0x42 |
| `acceptance/timer/tima_reload.gb` | Falla | registros a 0x42 |
| `acceptance/timer/tima_write_reloading.gb` | Falla | registros a 0x42 |
| `acceptance/timer/tma_write_reloading.gb` | Falla | registros a 0x42 |

### mooneye-mbc

| ROM | Resultado | Nota |
| --- | --- | --- |
| `emulator-only/mbc1/bits_bank1.gb` | Pasa | Fibonacci |
| `emulator-only/mbc1/bits_bank2.gb` | Falla | registros a 0x42 |
| `emulator-only/mbc1/bits_mode.gb` | Falla | registros a 0x42 |
| `emulator-only/mbc1/bits_ramg.gb` | Falla | registros a 0x42 |
| `emulator-only/mbc1/ram_64kb.gb` | Falla | registros a 0x42 |
| `emulator-only/mbc2/bits_ramg.gb` | No soportada | MBC rechazado al cargar |
| `emulator-only/mbc2/bits_romb.gb` | No soportada | MBC rechazado al cargar |
| `emulator-only/mbc2/bits_unused.gb` | No soportada | MBC rechazado al cargar |
| `emulator-only/mbc2/ram.gb` | No soportada | MBC rechazado al cargar |
| `emulator-only/mbc5/rom_512kb.gb` | Pasa | Fibonacci |

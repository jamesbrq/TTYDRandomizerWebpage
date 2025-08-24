// Minimal BSDIFF (bspatch) in JS
// based on Colin Percival's format
async function applyBsdiff(oldBuf, patchBuf) {
    function readInt64(buf, off) {
        let lo = buf[off] | (buf[off+1]<<8) | (buf[off+2]<<16) | (buf[off+3]<<24);
        let hi = buf[off+4] | (buf[off+5]<<8) | (buf[off+6]<<16) | (buf[off+7]<<24);
        let val = hi * 2**32 + (lo >>> 0);
        if (hi & 0x80000000) val -= 2**64;
        return val;
    }

    const header = new TextDecoder().decode(patchBuf.slice(0,8));
    if (header !== "BSDIFF40") throw new Error("Invalid patch format");

    const ctrlLen = readInt64(patchBuf, 8);
    const diffLen = readInt64(patchBuf, 16);
    const newSize = readInt64(patchBuf, 24);

    const ctrlEnd = 32 + ctrlLen;
    const diffEnd = ctrlEnd + diffLen;

    const ctrlBuf = patchBuf.slice(32, ctrlEnd);
    const diffBuf = patchBuf.slice(ctrlEnd, diffEnd);
    const extraBuf = patchBuf.slice(diffEnd);

    let oldPos = 0, newPos = 0;
    let newBuf = new Uint8Array(newSize);

    let ctrlPos = 0, diffPos = 0, extraPos = 0;
    const getCtrl = () => {
        const x = readInt64(ctrlBuf, ctrlPos); ctrlPos += 8;
        const y = readInt64(ctrlBuf, ctrlPos); ctrlPos += 8;
        const z = readInt64(ctrlBuf, ctrlPos); ctrlPos += 8;
        return [x,y,z];
    };

    while (newPos < newSize) {
        const [x,y,z] = getCtrl();

        // Apply diff
        for (let i=0; i<x; i++) {
            let byte = diffBuf[diffPos+i];
            if ((oldPos+i) >= 0 && (oldPos+i) < oldBuf.length)
                byte = (byte + oldBuf[oldPos+i]) & 0xFF;
            newBuf[newPos+i] = byte;
        }
        newPos += x; oldPos += x; diffPos += x;

        // Copy extra
        newBuf.set(extraBuf.slice(extraPos, extraPos+y), newPos);
        newPos += y; oldPos += z; extraPos += y;
    }
    return newBuf;
}

export { applyBsdiff };

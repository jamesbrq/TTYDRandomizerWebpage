// IPS (International Patching System) implementation in JavaScript

// Function to apply IPS patch
function applyIPS(originalData, ipsData) {
    // Check IPS header
    if (ipsData.length < 5 || 
        String.fromCharCode(ipsData[0], ipsData[1], ipsData[2], ipsData[3], ipsData[4]) !== 'PATCH') {
        throw new Error('Invalid IPS file format');
    }
    
    // First pass: determine the maximum size needed
    let maxSize = originalData.length;
    let offset = 5; // Skip "PATCH" header
    
    while (offset < ipsData.length - 3) {
        // Check for EOF marker
        if (String.fromCharCode(ipsData[offset], ipsData[offset + 1], ipsData[offset + 2]) === 'EOF') {
            // Check if there's a truncation size after EOF
            if (offset + 3 + 3 <= ipsData.length) {
                const truncateSize = (ipsData[offset + 3] << 16) | (ipsData[offset + 4] << 8) | ipsData[offset + 5];
                if (truncateSize > 0) {
                    maxSize = truncateSize;
                }
            }
            break;
        }
        
        // Read patch offset (3 bytes, big-endian)
        const patchOffset = (ipsData[offset] << 16) | (ipsData[offset + 1] << 8) | ipsData[offset + 2];
        offset += 3;
        
        // Read patch size (2 bytes, big-endian)
        const patchSize = (ipsData[offset] << 8) | ipsData[offset + 1];
        offset += 2;
        
        if (patchSize === 0) {
            // RLE encoding
            const rleSize = (ipsData[offset] << 8) | ipsData[offset + 1];
            offset += 2;
            offset += 1; // Skip RLE byte
            
            // Update max size if this patch extends beyond current size
            maxSize = Math.max(maxSize, patchOffset + rleSize);
        } else {
            // Normal patch
            offset += patchSize;
            
            // Update max size if this patch extends beyond current size
            maxSize = Math.max(maxSize, patchOffset + patchSize);
        }
    }
    
    // Create result array with the maximum required size
    const result = new Uint8Array(maxSize);
    result.set(originalData); // Copy original data
    
    // Second pass: apply patches
    offset = 5; // Reset to skip "PATCH" header
    
    while (offset < ipsData.length - 3) {
        // Check for EOF marker
        if (String.fromCharCode(ipsData[offset], ipsData[offset + 1], ipsData[offset + 2]) === 'EOF') {
            break;
        }
        
        // Read patch offset (3 bytes, big-endian)
        const patchOffset = (ipsData[offset] << 16) | (ipsData[offset + 1] << 8) | ipsData[offset + 2];
        offset += 3;
        
        // Read patch size (2 bytes, big-endian)
        const patchSize = (ipsData[offset] << 8) | ipsData[offset + 1];
        offset += 2;
        
        if (patchSize === 0) {
            // RLE encoding
            const rleSize = (ipsData[offset] << 8) | ipsData[offset + 1];
            offset += 2;
            const rleByte = ipsData[offset];
            offset += 1;
            
            // Apply RLE patch
            for (let i = 0; i < rleSize; i++) {
                if (patchOffset + i < result.length) {
                    result[patchOffset + i] = rleByte;
                }
            }
        } else {
            // Normal patch
            for (let i = 0; i < patchSize; i++) {
                if (patchOffset + i < result.length && offset + i < ipsData.length) {
                    result[patchOffset + i] = ipsData[offset + i];
                }
            }
            offset += patchSize;
        }
    }
    
    return result;
}

export { applyIPS };
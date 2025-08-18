const ASSET_PATHS = {
    SARDINE: 'small_fish.svg',
    MACKEREL:'medium_fish.svg',
    BONITO:  'large_fish.svg',
    CUTLASS: 'cutlass.svg',
    SHARK:   'shark.svg',
    MARLIN:  'marlin.svg',
    WHALE:   'whale.svg',
    RAY:     'ray.svg',
    TUNA:    'tuna.svg'
};

function loadAssets() {
    const promises = [];
    const images = {};

    for (const [key, path] of Object.entries(ASSET_PATHS)) {
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                images[key] = img;
                resolve();
            };
            img.onerror = () => {
                console.error(`Failed to load asset: ${path}`);
                reject(new Error(`Failed to load asset: ${path}`));
            };
            img.src = path;
        });
        promises.push(promise);
    }

    return Promise.all(promises).then(() => images);
}
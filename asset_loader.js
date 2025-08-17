const ASSET_PATHS = {
    SMALL:   'assets/small_fish.svg',
    MEDIUM:  'assets/medium_fish.svg',
    LARGE:   'assets/large_fish.svg',
    CUTLASS: 'assets/cutlass.svg',
    SHARK:   'assets/shark.svg',
    MARLIN:  'assets/marlin.svg',
    WHALE:   'assets/whale.svg' // この行を追加
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
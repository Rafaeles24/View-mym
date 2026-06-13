export function reconcileByActive<T extends { id: number; active: boolean}>(
    prev: T[],
    incoming: T[]
): T[] {

    const map = new Map(prev.map(i => [i.id, i]));

    incoming.forEach(item => {
        if (item.active) {
            map.set(item.id, item);
        } else {
            map.delete(item.id);
        }
    });

    return Array.from(map.values());
}
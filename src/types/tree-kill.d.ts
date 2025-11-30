declare module 'tree-kill' {
    /**
     * Kills all processes in the tree rooted at the given pid.
     * @param pid - Process ID to kill
     * @param signal - Signal to send (default: 'SIGTERM')
     * @param callback - Callback function called when complete
     */
    function treeKill(
        pid: number,
        signal?: string | number,
        callback?: (error?: Error) => void
    ): void;

    export default treeKill;
}

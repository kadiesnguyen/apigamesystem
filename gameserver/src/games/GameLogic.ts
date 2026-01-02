export abstract class GameLogic<PlayInput = any, PlayResult = any> {

    abstract play(input: PlayInput): PlayResult;

    validate?(input: PlayInput): boolean;

    calculateReward?(input: PlayInput, result: PlayResult): number;

    abstract getName(): string;
}

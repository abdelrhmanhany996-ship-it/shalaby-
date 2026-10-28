/** A refusal with a reason written for the person who clicked: shown on screen instead of failing silently. */
export class ActionDenied extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionDenied";
  }
}

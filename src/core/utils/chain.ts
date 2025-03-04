export interface IChainHandler<Request, Responce> {
    setNext(handler: IChainHandler<Request, Responce>): IChainHandler<Request, Responce>
    handle(request: Request): Promise<Responce>
}

export class Chain<Request, Response> {
    private handlers: IChainHandler<Request, Response>[] = [];

    use(handler: IChainHandler<Request, Response>): void {
        if (this.handlers.length > 0) {
            this.handlers[this.handlers.length - 1].setNext(handler);
        }
        this.handlers.push(handler);
    }

    handle(request: Request): Promise<Response> {
        if (this.handlers.length > 0) {
            return this.handlers[0].handle(request);
        }

        return Promise.resolve({} as Response);
    }
}

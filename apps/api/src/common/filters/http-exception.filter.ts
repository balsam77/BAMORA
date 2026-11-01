import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { databaseFailureDetails, databaseFailureMessage } from "../../prisma/database-diagnostics";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const databaseFailure = databaseFailureDetails(exception);
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : databaseFailure?.unavailable ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : databaseFailure?.unavailable ? "Database is unavailable or its schema is incompatible." : "Internal server error";

    this.logger.error(
      `${request.method} ${request.path} -> ${status}; ${
        databaseFailure ? databaseFailureMessage(exception) :
        exception instanceof HttpException ? "HTTP exception" : "Unhandled application error; details withheld."
      }`,
    );

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}

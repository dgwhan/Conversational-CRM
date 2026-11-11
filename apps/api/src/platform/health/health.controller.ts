import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator.js";

@Public()
@Controller('health')
export class HealthController {
    @Get()
    checkHealth() {
        return {status: 'ok'};
    }
}
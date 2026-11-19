import { Controller, Get } from '@nestjs/common';
import { KitchensService } from './kitchens.service';

@Controller('kitchens')
export class KitchensController {
  constructor(private readonly kitchensService: KitchensService) {}

  @Get()
  list() {
    return this.kitchensService.list();
  }
}

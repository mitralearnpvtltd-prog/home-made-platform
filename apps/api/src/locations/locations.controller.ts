import { Controller, Get, Query } from '@nestjs/common';
import { SearchLocationsQueryDto } from './dto/search-locations.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  search(@Query() query: SearchLocationsQueryDto) {
    return this.locationsService.search({
      type: query.type,
      q: query.q,
      limit: query.limit,
    });
  }
}

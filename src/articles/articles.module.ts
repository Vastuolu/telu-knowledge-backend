import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ArticlesController } from './articles.controller.js';
import { ArticlesService } from './articles.service.js';
import { ArticleContentValidator } from './validators/article-content.validator.js';

@Module({
  imports: [AuthModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticleContentValidator],
  exports: [ArticlesService, ArticleContentValidator],
})
export class ArticlesModule {}


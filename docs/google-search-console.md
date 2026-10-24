# Google: действия владельца после публикации

1. Откройте [Google Search Console](https://search.google.com/search-console/).
2. Добавьте ресурс **с префиксом URL**: `https://dedt1mon.github.io/`.
   Покупать домен или подтверждать DNS зоны `github.io` не нужно.
3. Выберите **HTML-файл** и скачайте выданный Google файл подтверждения.
   Добавьте его без изменения имени/содержимого в корень сайта через PR.
   После разрешённой публикации проверьте, что файл доступен по HTTPS,
   и нажмите «Подтвердить» в Search Console. Не удаляйте файл после проверки.
4. В разделе **Файлы Sitemap** отправьте `sitemap.xml`.
5. В **Проверке URL** укажите `https://dedt1mon.github.io/`, выполните проверку
   опубликованной страницы и выберите «Запросить индексирование».

Эти действия требуют вашего Google-аккаунта. Сейчас новые страницы находятся
в PR: отправлять ещё не опубликованный sitemap рано. Индексация и место в
выдаче не гарантируются; повторная отправка запросов не ускоряет обработку.

Официальные инструкции:
[подтверждение](https://support.google.com/webmasters/answer/9008080?hl=ru),
[сканирование и индексирование](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=ru),
[основы SEO](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

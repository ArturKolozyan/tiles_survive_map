# Tiles Survive - Battle Map

## Деплой на Railway.app

1. Загрузи проект на GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

2. Зайди на https://railway.app и войди через GitHub

3. New Project → Deploy from GitHub repo → выбери репозиторий

4. Settings → Variables → добавь:
   - `DEBUG` = `False`
   - `SECRET_KEY` = `любой-длинный-случайный-текст-123456789`

5. Settings → Generate Domain

Готово! Сайт работает 24/7.

## Локальный запуск

```bash
pip install -r requirements.txt
python manage.py runserver
```

Открой http://127.0.0.1:8000

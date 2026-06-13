const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const { requireImportKey } = require('../middleware/auth');

// ============================================
// GET /api/celebrities — Lấy tất cả danh nhân
// Bao gồm: tên thời kỳ + danh sách lĩnh vực
// ============================================
router.get('/', async (req, res) => {
  try {
    // Lấy danh sách danh nhân kèm thời kỳ
    const { data: celebs, error: celebsError } = await supabase
      .from('celebrities')
      .select(`
        id, name, alternative_name, 
        birth_date, death_date, nationality,
        summary, avatar_image, created_at,
        historical_periods (name)
      `)
      .order('name');

    if (celebsError) throw celebsError;

    // Lấy tất cả quan hệ danh nhân - lĩnh vực
    const { data: fieldsData, error: fieldsError } = await supabase
      .from('celebrity_fields')
      .select(`
        celebrity_id,
        fields (id, name)
      `);

    if (fieldsError) throw fieldsError;

    // Gộp lĩnh vực vào từng danh nhân
    const formatted = (celebs || []).map(c => ({
      id: c.id,
      name: c.name,
      alternative_name: c.alternative_name,
      birth_date: c.birth_date,
      death_date: c.death_date,
      nationality: c.nationality,
      summary: c.summary,
      avatar_image: c.avatar_image,
      created_at: c.created_at,
      period_name: c.historical_periods?.name || null,
      fields: (fieldsData || [])
        .filter(cf => cf.celebrity_id === c.id && cf.fields)
        .map(cf => ({ id: cf.fields.id, name: cf.fields.name }))
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Lỗi lấy danh sách danh nhân:', error.message);
    res.status(500).json({ error: 'Không thể lấy danh sách danh nhân: ' + error.message });
  }
});

// ============================================
// GET /api/celebrities/:id — Lấy chi tiết 1 danh nhân
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id) || 0;

    // Thông tin danh nhân
    const { data: celeb, error: celebError } = await supabase
      .from('celebrities')
      .select(`
        id, name, alternative_name,
        birth_date, death_date, nationality,
        summary, avatar_image, created_at,
        historical_period_id,
        historical_periods (name, description)
      `)
      .eq('id', id)
      .maybeSingle();

    if (celebError) throw celebError;
    if (!celeb) {
      return res.status(404).json({ error: 'Không tìm thấy danh nhân' });
    }

    // Lĩnh vực của danh nhân
    const { data: cfData, error: cfError } = await supabase
      .from('celebrity_fields')
      .select('fields (id, name, description)')
      .eq('celebrity_id', id);

    if (cfError) throw cfError;

    const formattedFields = (cfData || [])
      .filter(x => x.fields)
      .map(x => x.fields);

    // Câu chuyện của danh nhân
    const { data: storiesData, error: storiesError } = await supabase
      .from('stories')
      .select('id, title, view_count, created_at')
      .eq('celebrity_id', id)
      .order('created_at', { ascending: false });

    if (storiesError) throw storiesError;

    const formattedCeleb = {
      id: celeb.id,
      name: celeb.name,
      alternative_name: celeb.alternative_name,
      birth_date: celeb.birth_date,
      death_date: celeb.death_date,
      nationality: celeb.nationality,
      summary: celeb.summary,
      avatar_image: celeb.avatar_image,
      created_at: celeb.created_at,
      historical_period_id: celeb.historical_period_id,
      period_name: celeb.historical_periods?.name || null,
      period_description: celeb.historical_periods?.description || null,
      fields: formattedFields,
      stories: storiesData || []
    };

    res.json(formattedCeleb);
  } catch (error) {
    console.error('Lỗi lấy chi tiết danh nhân:', error.message);
    res.status(500).json({ error: 'Không thể lấy thông tin danh nhân: ' + error.message });
  }
});

// ============================================
// GET /api/celebrities/field/:fieldId — Lấy danh nhân theo lĩnh vực
// ============================================
router.get('/field/:fieldId', async (req, res) => {
  try {
    const fieldId = parseInt(req.params.fieldId) || 0;

    const { data: cfData, error: cfError } = await supabase
      .from('celebrity_fields')
      .select(`
        celebrities (
          id, name, alternative_name,
          birth_date, death_date, nationality,
          summary, avatar_image,
          historical_periods (name)
        )
      `)
      .eq('field_id', fieldId);

    if (cfError) throw cfError;

    const formatted = (cfData || [])
      .filter(x => x.celebrities)
      .map(x => ({
        id: x.celebrities.id,
        name: x.celebrities.name,
        alternative_name: x.celebrities.alternative_name,
        birth_date: x.celebrities.birth_date,
        death_date: x.celebrities.death_date,
        nationality: x.celebrities.nationality,
        summary: x.celebrities.summary,
        avatar_image: x.celebrities.avatar_image,
        period_name: x.celebrities.historical_periods?.name || null
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(formatted);
  } catch (error) {
    console.error('Lỗi lấy danh nhân theo lĩnh vực:', error.message);
    res.status(500).json({ error: 'Không thể lấy danh nhân theo lĩnh vực: ' + error.message });
  }
});

// ============================================
// POST /api/celebrities — Thêm danh nhân mới (chỉ admin)
// ============================================
router.post('/', requireImportKey, async (req, res) => {
  try {
    const {
      name, realName, birthYear, deathYear,
      shortDescription, image, era, category
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Thiếu tên danh nhân' });
    }

    // Tìm hoặc tạo thời kỳ lịch sử
    let periodId = null;
    if (era) {
      const { data: existingPeriod, error: periodError } = await supabase
        .from('historical_periods')
        .select('id')
        .eq('name', era.trim())
        .maybeSingle();

      if (periodError) throw periodError;

      if (existingPeriod) {
        periodId = existingPeriod.id;
      } else {
        const { data: newPeriod, error: newPeriodError } = await supabase
          .from('historical_periods')
          .insert({ name: era.trim() })
          .select('id')
          .single();

        if (newPeriodError) throw newPeriodError;
        periodId = newPeriod.id;
      }
    }

    // Thêm danh nhân
    const { data: newCeleb, error: insertError } = await supabase
      .from('celebrities')
      .insert({
        name: name.trim(),
        alternative_name: realName || null,
        birth_date: birthYear ? String(birthYear) : null,
        death_date: deathYear ? String(deathYear) : null,
        summary: shortDescription || null,
        avatar_image: image || null,
        historical_period_id: periodId
      })
      .select('id, name')
      .single();

    if (insertError) throw insertError;

    // Thêm liên kết lĩnh vực (category_fields)
    if (category) {
      let searchFieldName = '';
      if (category === 'anh-hung') searchFieldName = 'Quân sự';
      else if (category === 'lanh-tu') searchFieldName = 'Chính trị';
      else if (category === 'khoa-hoc') searchFieldName = 'Khoa học';
      else if (category === 'nha-van') searchFieldName = 'Văn học';
      else if (category === 'cong-nghe') searchFieldName = 'Công nghệ';
      else if (category === 'kinh-doanh') searchFieldName = 'Kinh doanh';

      if (searchFieldName) {
        const { data: matchedField, error: fieldFindError } = await supabase
          .from('fields')
          .select('id')
          .ilike('name', `%${searchFieldName}%`)
          .maybeSingle();

        if (!fieldFindError && matchedField) {
          await supabase
            .from('celebrity_fields')
            .insert({
              celebrity_id: newCeleb.id,
              field_id: matchedField.id
            });
        }
      }
    }

    res.status(201).json({
      message: 'Thêm danh nhân thành công!',
      celebrity: newCeleb
    });
  } catch (error) {
    console.error('Lỗi thêm danh nhân:', error.message);
    res.status(500).json({ error: 'Không thể thêm danh nhân: ' + error.message });
  }
});

// ============================================
// PUT /api/celebrities/:id — Cập nhật danh nhân (chỉ admin)
// ============================================
router.put('/:id', requireImportKey, async (req, res) => {
  try {
    const id = parseInt(req.params.id) || 0;
    const {
      name, realName, birthYear, deathYear,
      shortDescription, image, era, category
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Thiếu tên danh nhân' });
    }

    // Tìm hoặc tạo thời kỳ lịch sử
    let periodId = null;
    if (era) {
      const { data: existingPeriod, error: periodError } = await supabase
        .from('historical_periods')
        .select('id')
        .eq('name', era.trim())
        .maybeSingle();

      if (periodError) throw periodError;

      if (existingPeriod) {
        periodId = existingPeriod.id;
      } else {
        const { data: newPeriod, error: newPeriodError } = await supabase
          .from('historical_periods')
          .insert({ name: era.trim() })
          .select('id')
          .single();

        if (newPeriodError) throw newPeriodError;
        periodId = newPeriod.id;
      }
    }

    // Cập nhật thông tin danh nhân
    const { error: updateError } = await supabase
      .from('celebrities')
      .update({
        name: name.trim(),
        alternative_name: realName || null,
        birth_date: birthYear ? String(birthYear) : null,
        death_date: deathYear ? String(deathYear) : null,
        summary: shortDescription || null,
        avatar_image: image || null,
        historical_period_id: periodId
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Cập nhật lĩnh vực (category_fields)
    if (category) {
      // 1. Xóa liên kết cũ
      await supabase
        .from('celebrity_fields')
        .delete()
        .eq('celebrity_id', id);

      // 2. Tìm fieldId mới
      let searchFieldName = '';
      if (category === 'anh-hung') searchFieldName = 'Quân sự';
      else if (category === 'lanh-tu') searchFieldName = 'Chính trị';
      else if (category === 'khoa-hoc') searchFieldName = 'Khoa học';
      else if (category === 'nha-van') searchFieldName = 'Văn học';
      else if (category === 'cong-nghe') searchFieldName = 'Công nghệ';
      else if (category === 'kinh-doanh') searchFieldName = 'Kinh doanh';

      if (searchFieldName) {
        const { data: matchedField, error: fieldFindError } = await supabase
          .from('fields')
          .select('id')
          .ilike('name', `%${searchFieldName}%`)
          .maybeSingle();

        if (!fieldFindError && matchedField) {
          await supabase
            .from('celebrity_fields')
            .insert({
              celebrity_id: id,
              field_id: matchedField.id
            });
        }
      }
    }

    res.json({ message: 'Cập nhật danh nhân thành công!' });
  } catch (error) {
    console.error('Lỗi cập nhật danh nhân:', error.message);
    res.status(500).json({ error: 'Không thể cập nhật danh nhân: ' + error.message });
  }
});

// ============================================
// DELETE /api/celebrities/:id — Xóa danh nhân (chỉ admin)
// ============================================
router.delete('/:id', requireImportKey, async (req, res) => {
  try {
    const id = parseInt(req.params.id) || 0;

    // 1. Xóa liên kết lĩnh vực
    await supabase
      .from('celebrity_fields')
      .delete()
      .eq('celebrity_id', id);

    // 2. Tìm tất cả các câu chuyện thuộc danh nhân này để xóa bình luận trước
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('id')
      .eq('celebrity_id', id);

    if (!storiesError && stories && stories.length > 0) {
      const storyIds = stories.map(s => s.id);
      
      // Xóa bình luận của các câu chuyện
      await supabase
        .from('comments')
        .delete()
        .in('story_id', storyIds);
        
      // Xóa các câu chuyện
      await supabase
        .from('stories')
        .delete()
        .in('id', storyIds);
    }

    // 3. Xóa danh nhân
    const { error: deleteError } = await supabase
      .from('celebrities')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ message: 'Xóa danh nhân thành công!' });
  } catch (error) {
    console.error('Lỗi xóa danh nhân:', error.message);
    res.status(500).json({ error: 'Không thể xóa danh nhân: ' + error.message });
  }
});

module.exports = router;
